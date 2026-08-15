import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI } from '../../services/api';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { MessageHeader, Message, SearchResult, SendMessageRequest, ReplyMessageRequest } from '../../types';
import SEO from '../seo/SEO';
import {
  PlusIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  UserIcon,
  InboxArrowDownIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  AcademicCapIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

const Messages: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<MessageHeader[]>(() => {
    const cached = localStorage.getItem('messages_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  const [messageType, setMessageType] = useState<'All' | 'Unread' | 'Sent'>('All');
  const [messageSearch, setMessageSearch] = useState('');

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um Nachrichten zu sehen.</p>
        </div>
      </div>
    );
  }

  const [composeData, setComposeData] = useState({
    recipients: [] as SearchResult[],
    subject: '',
    content: '',
  });
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const USERNAME_CACHE_KEY = 'username_cache';
  const USERNAME_CACHE_TTL = 365 * 24 * 60 * 60 * 1000;

  const loadUsernameCache = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem(USERNAME_CACHE_KEY);
      if (!raw) return {};
      const parsed: { data: Record<string, string>; ts: number } = JSON.parse(raw);
      if (Date.now() - parsed.ts > USERNAME_CACHE_TTL) {
        localStorage.removeItem(USERNAME_CACHE_KEY);
        return {};
      }
      return parsed.data;
    } catch { return {}; }
  };

  const saveUsernameCache = (data: Record<string, string>) => {
    localStorage.setItem(USERNAME_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  };

  const usernameCache = useRef<Record<string, string>>(loadUsernameCache());

  const applyUsernameCache = (msgs: MessageHeader[]) => {
    if (Object.keys(usernameCache.current).length === 0) return msgs;
    return msgs.map(m => ({
      ...m,
      Sender: usernameCache.current[m.Sender] || m.Sender,
    }));
  };

  useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    loadMessages(abortController.signal);
    return () => abortController.abort();
  }, [token, messageType]);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && token) {
      loadConversation(conversationId);
    }
  }, [searchParams, token]);

  useEffect(() => {
    const recipientId = searchParams.get('recipient');
    if (searchParams.get('compose') !== '1' || !recipientId) return;

    const recipient: SearchResult = {
      id: recipientId,
      name: searchParams.get('recipientName') || searchParams.get('recipientUsername') || 'Lehrkraft',
      username: searchParams.get('recipientUsername') || '',
      type: 'Lehrkraft',
    };
    setComposeData(previous => ({
      ...previous,
      recipients: previous.recipients.some(item => item.id === recipient.id)
        ? previous.recipients
        : [...previous.recipients, recipient],
    }));
    setShowCompose(true);
  }, [searchParams]);

  const loadMessages = async (signal?: AbortSignal) => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const response = await messagesAPI.getMessageHeaders(token, messageType, 0, signal);
      if (signal?.aborted) return;
      if (response.success) {
        const transformedMessages = response.conversations.map((msg: any) => ({
          Id: msg.Id || msg.id,
          Uniquid: msg.id || msg.Uniquid,
          Sender: msg.sender || msg.Sender,
          Betreff: msg.Betreff,
          WeitereEmpfaenger: msg.WeitereEmpfaenger,
          private: msg.private || 0,
          empf: msg.empf || [],
          Papierkorb: msg.Papierkorb,
          unread: !!(msg.unread === 1),
          date: msg.date || new Date().toISOString(),
        }));
        const resolved = applyUsernameCache(transformedMessages);
        setMessages(resolved);
        localStorage.setItem('messages_cache', JSON.stringify(resolved));
      } else {
        setError('Fehler beim Laden der Nachrichten.');
      }
      setIsLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error loading messages:', error);
      setError('Fehler beim Laden der Nachrichten.');
      setIsLoading(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!token) return;
    try {
      setIsConversationLoading(true);
      setSelectedConversation(conversationId);
      const response = await messagesAPI.getConversation(token, conversationId);
      if (response.success && response.messages) {
        const transformedMessages = response.messages.map((msg: any) => ({
          id: msg.Id || msg.id,
          sender: msg.username || msg.sender || msg.Sender || 'Unbekannter Sender',
          content: msg.Inhalt || msg.content || '',
          date: msg.Datum || msg.date || new Date().toISOString(),
          ...msg
        }));
        setConversationMessages(transformedMessages);
        setError('');
        loadMessages();
      } else {
        if (response && typeof response === 'object' && 'error' in response) {
          if (response.error === 'No message data in response: {\'error\': \'-1\'}') {
            setError('Diese Unterhaltung konnte nicht geladen werden. Möglicherweise ist sie nicht mehr verfügbar oder Sie haben keine Berechtigung.');
          } else {
            setError(`Fehler beim Laden der Unterhaltung: ${response.error}`);
          }
        } else {
          setError('Unbekannter Fehler beim Laden der Unterhaltung.');
        }
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      if (error?.response?.status === 404) {
        setError('Unterhaltung nicht gefunden.');
      } else if (error?.response?.status === 401) {
        setError('Nicht berechtigt, diese Unterhaltung zu laden.');
      } else {
        setError('Fehler beim Laden der Unterhaltung. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setIsConversationLoading(false);
    }
  };

  const searchRecipients = async (query: string) => {
    if (!token || !query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const response = await messagesAPI.searchRecipients(token, query);
      if (response.success) {
        setSearchResults(response.results);
      }
    } catch (error) {
      console.error('Error searching recipients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addRecipient = (recipient: SearchResult) => {
    if (!composeData.recipients.some(r => r.id === recipient.id)) {
      setComposeData(prev => ({
        ...prev,
        recipients: [...prev.recipients, recipient]
      }));
    }
    setRecipientSearch('');
    setSearchResults([]);
  };

  const removeRecipient = (recipientId: string) => {
    setComposeData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== recipientId)
    }));
  };

  const sendMessage = async () => {
    if (!token || composeData.recipients.length === 0 || !composeData.subject.trim() || !composeData.content.trim()) {
      return;
    }
    try {
      setIsSending(true);
      const messageRequest: SendMessageRequest = {
        recipients: composeData.recipients.map(r => r.id),
        subject: composeData.subject,
        content: composeData.content,
      };
      const response = await messagesAPI.sendMessage(token, messageRequest);
      if (response.success) {
        setShowCompose(false);
        setComposeData({ recipients: [], subject: '', content: '' });
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Fehler beim Senden der Nachricht.');
    } finally {
      setIsSending(false);
    }
  };

  const sendReply = async () => {
    if (!token || !selectedConversation || !replyBody.trim()) return;
    try {
      setIsReplying(true);
      const replyRequest: ReplyMessageRequest = {
        conversation_id: selectedConversation,
        body: replyBody,
        to: 'all',
      };
      const response = await messagesAPI.replyMessage(token, replyRequest);
      if (response.success) {
        setReplyBody('');
        loadMessages();
        loadConversation(selectedConversation);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Fehler beim Senden der Antwort.');
    } finally {
      setIsReplying(false);
    }
  };

  const closeParticipantsModal = () => {
    setShowParticipants(false);
    setParticipantSearch('');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return dateString;
    }
  };

  if (isLoading && (!messages || messages.length === 0)) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-screen flex overflow-hidden">
      <SEO
        title="Nachrichten"
        description="Lanis Nachrichten — Kommuniziere mit Lehrkräften und Mitschülern über das Schulportal Hessen."
        path="/messages"
        noindex
      />
      {/* Messages list - hidden on mobile when conversation is selected */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-1/3 border-r border-surface-100 dark:border-surface-800 flex-col bg-white dark:bg-surface-900`}>
        <div className="p-4 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100 tracking-tight">Nachrichten</h1>
            <button
              onClick={() => setShowCompose(true)}
              className="btn btn-primary h-9 px-3 text-xs"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Neue
            </button>
          </div>

          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 mb-3">
            {(['All', 'Unread', 'Sent'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMessageType(type)}
                className={clsx(
                  'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-200',
                  messageType === type
                    ? 'bg-white dark:bg-surface-800 text-primary-600 shadow-soft'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'
                )}
              >
                {type === 'All' ? 'Alle' : type === 'Unread' ? 'Ungelesen' : 'Gesendet'}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="input text-sm"
            placeholder="Nachrichten durchsuchen..."
            value={messageSearch}
            onChange={e => setMessageSearch(e.target.value)}
          />
        </div>

        

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-xs">
              {error}
            </div>
          )}

          {messages && messages.length === 0 ? (
            <div className="empty-state">
              <InboxArrowDownIcon className="empty-state-icon" />
              <h3 className="empty-state-title">Keine Nachrichten</h3>
              <p className="empty-state-text">
                {messageType === 'Unread' ? 'Keine ungelesenen Nachrichten vorhanden.' : 'Keine Nachrichten vorhanden.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {(messages && messages
                .filter(message => {
                  if (!messageSearch.trim()) return true;
                  const search = messageSearch.toLowerCase();
                  const subject = (message.Betreff || '').toLowerCase();
                  const sender = (message.Sender || '').toLowerCase();
                  const empf = Array.isArray(message.empf) ? message.empf.join(' ').toLowerCase() : '';
                  return (
                    subject.includes(search) ||
                    sender.includes(search) ||
                    empf.includes(search)
                  );
                })
                .map((message) => (
                  <div
                    key={message.Uniquid}
                    className={clsx(
                      'px-4 py-3 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer transition-colors duration-150',
                      selectedConversation === message.Uniquid && 'bg-surface-100 dark:bg-surface-800',
                      message.unread && 'bg-surface-50 dark:bg-surface-800/50'
                    )}
                    onClick={() => loadConversation(message.Uniquid)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-surface-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={clsx(
                            'text-sm truncate',
                            message.unread ? 'font-semibold text-surface-900 dark:text-surface-100' : 'font-medium text-surface-700 dark:text-surface-400'
                          )}>
                            {message.Betreff}
                          </p>
                          <p className="text-[11px] text-surface-400 whitespace-nowrap">
                            {message.date ? formatDate(message.date) : 'Heute'}
                          </p>
                        </div>
                        <p className="text-xs truncate mt-0.5 text-surface-500 dark:text-surface-400">
                          {message.Sender}
                        </p>
                      </div>
                      {message.unread && (
                        <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation view - visible on mobile only when conversation selected */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0`}>
        {selectedConversation ? (
          <>
            <div className="border-b border-surface-100 dark:border-surface-800 p-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {messages.find(m => m.Uniquid === selectedConversation)?.Betreff || 'Unterhaltung'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowParticipants(true)}
                  className="btn btn-secondary h-8 px-3 text-xs flex-shrink-0"
                >
                  <UsersIcon className="h-3.5 w-3.5 mr-1.5" />
                  Teilnehmer
                </button>
              </div>
            </div>

            {isConversationLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" />
              </div>
            ) : (
              <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversationMessages && conversationMessages.map((message) => (
                  <div key={message.id} className="card">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            {message.sender}
                          </p>
                          <p className="text-[11px] text-surface-400 whitespace-nowrap">
                            {formatDate(message.date)}
                          </p>
                        </div>
                        <div
                          className="min-w-0 max-w-full break-words [overflow-wrap:anywhere] text-sm text-surface-700 dark:text-surface-300 leading-relaxed [&_a]:text-primary-600 [&_a:hover]:underline"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-surface-100 dark:border-surface-800 p-4 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm">
                <textarea
                  rows={3}
                  className="input text-sm resize-none mb-3"
                  placeholder="Antwort schreiben..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <div className="flex items-center justify-end">
                  <button
                    onClick={sendReply}
                    disabled={isReplying || !replyBody.trim()}
                    className="btn btn-primary h-9 text-xs disabled:opacity-50"
                  >
                    {isReplying ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Senden...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <PaperAirplaneIcon className="h-3.5 w-3.5" />
                        Antworten
                      </span>
                    )}
                  </button>
                </div>
              </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <InboxArrowDownIcon className="mx-auto h-12 w-12 text-surface-300" />
              <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">Wählen Sie eine Nachricht aus, um sie anzuzeigen</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-800 rounded-2xl sm:rounded-2xl shadow-soft-lg max-w-lg w-full max-h-[85vh] flex flex-col animate-scale-in mx-2 sm:mx-0">
            <div className="flex items-center justify-between p-5 border-b border-surface-100 dark:border-surface-800">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Neue Nachricht</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="label">Empfänger</label>
                <div className="space-y-2">
                  {composeData.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {composeData.recipients.map((recipient) => (
                        <span
                          key={recipient.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                        >
                          {recipient.name}
                          <button
                            onClick={() => removeRecipient(recipient.id)}
                            className="text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Empfänger suchen..."
                      className="input text-sm"
                      value={recipientSearch}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value);
                        searchRecipients(e.target.value);
                      }}
                    />
                    {isSearching && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="w-3 h-3 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin block" />
                      </span>
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border border-surface-200 rounded-xl overflow-hidden">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => addRecipient(result)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800 border-b border-surface-100 dark:border-surface-700 last:border-b-0 transition-colors text-sm"
                        >
                          <div className="font-medium text-surface-900 dark:text-surface-100">{result.name}</div>
                          <div className="text-xs text-surface-500 dark:text-surface-400">{result.username}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Betreff</label>
                <input
                  type="text"
                  className="input text-sm"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Nachricht</label>
                <textarea
                  rows={8}
                  className="input text-sm resize-none"
                  value={composeData.content}
                  onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-surface-100 dark:border-surface-800">
              <button
                onClick={() => setShowCompose(false)}
                className="btn btn-secondary h-9 text-xs"
              >
                Abbrechen
              </button>
              <button
                onClick={sendMessage}
                disabled={isSending || composeData.recipients.length === 0 || !composeData.subject.trim() || !composeData.content.trim()}
                className="btn btn-primary h-9 text-xs disabled:opacity-50"
              >
                {isSending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Senden...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <PaperAirplaneIcon className="h-3.5 w-3.5" />
                    Senden
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants modal */}
      {showParticipants && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-800 rounded-2xl sm:rounded-2xl shadow-soft-lg max-w-md w-full max-h-[70vh] flex flex-col animate-scale-in mx-2 sm:mx-0">
            <div className="flex items-center justify-between p-5 border-b border-surface-100 dark:border-surface-800">
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">Teilnehmer</h3>
              <button
                onClick={closeParticipantsModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto">
              {(() => {
                const conversationMessage = conversationMessages.find(msg => msg.statistik);
                const stats = conversationMessage?.statistik;
                const messageHeader = messages.find(m => m.Uniquid === selectedConversation);

                if (!stats && !messageHeader) {
                  return (
                    <div className="empty-state">
                      <UsersIcon className="empty-state-icon" />
                      <p className="empty-state-text">Keine Teilnehmerinformationen verfügbar</p>
                    </div>
                  );
                }

                const getAllParticipants = () => {
                  const participants = new Map();
                  if (messageHeader?.Sender) {
                    const senderMessage = conversationMessages.find(msg =>
                      msg.Sender === messageHeader.Sender || msg.sender === messageHeader.Sender
                    );
                    const senderName = senderMessage?.username || senderMessage?.SenderName || `Sender ${messageHeader.Sender}`;
                    const senderRole = senderMessage?.SenderArt || 'Sender';
                    participants.set(messageHeader.Sender, {
                      id: messageHeader.Sender,
                      name: senderName,
                      role: senderRole,
                      type: 'sender',
                      class: ''
                    });
                  }
                  if (messageHeader?.empf && Array.isArray(messageHeader.empf)) {
                    messageHeader.empf.forEach((recipient, index) => {
                      const cleanText = recipient.replace(/<[^>]*>/g, '').trim();
                      const match = cleanText.match(/^(.*?)\s*\(([^)]+)\)$/);
                      const name = match ? match[1].trim() : cleanText;
                      const className = match ? match[2].trim() : '';
                      participants.set(`recipient-${index}`, {
                        id: `recipient-${index}`,
                        name: name,
                        role: 'Teilnehmer',
                        type: 'recipient',
                        class: className
                      });
                    });
                  }
                  return Array.from(participants.values());
                };

                const allParticipants = getAllParticipants();
                const filteredParticipants = allParticipants.filter(participant =>
                  participantSearch === '' ||
                  participant.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                  (participant.class && participant.class.toLowerCase().includes(participantSearch.toLowerCase()))
                );

                return (
<div className="space-y-4">
                      {stats && (
                        <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3 uppercase tracking-wider">Übersicht</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                              <span className="text-surface-500">Teilnehmer:</span>
                              <span className="font-medium text-surface-900 dark:text-surface-100">{stats.teilnehmer}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400" />
                              <span className="text-surface-500">Betreuer:</span>
                              <span className="font-medium text-surface-900 dark:text-surface-100">{stats.betreuer}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400" />
                              <span className="text-surface-500">Eltern:</span>
                              <span className="font-medium text-surface-900 dark:text-surface-100">{stats.eltern}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-surface-400 dark:bg-surface-500" />
                              <span className="text-surface-500">Gesamt:</span>
                              <span className="font-medium text-surface-900 dark:text-surface-100">{stats.teilnehmer + stats.betreuer + stats.eltern}</span>
                            </div>
                          </div>
                        </div>
                      )}

                    <div>
                      <label className="label">Teilnehmer suchen</label>
                      <input
                        type="text"
                        placeholder="Name oder Klasse eingeben..."
                        className="input text-sm"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-surface-700">Alle Teilnehmer</h4>
                        <span className="text-[11px] text-surface-400">
                          {filteredParticipants.length} von {allParticipants.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {filteredParticipants.length === 0 && participantSearch !== '' ? (
                          <div className="text-center py-6">
                            <UserIcon className="mx-auto h-8 w-8 text-surface-300" />
                            <p className="mt-2 text-sm text-surface-500">Keine Teilnehmer gefunden</p>
                          </div>
                        ) : (
                          filteredParticipants.map((participant, index) => {
                            let roleColor = 'bg-surface-100 text-surface-700';
                            let IconComponent = UserIcon;
                            if (participant.type === 'sender') {
                              roleColor = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
                            } else {
                              roleColor = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
                              IconComponent = UserIcon;
                            }
                            if (participant.role === 'Betreuer') {
                              roleColor = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
                              IconComponent = AcademicCapIcon;
                            }
                            return (
                              <div key={participant.id} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-800 rounded-xl">
                                <div className="w-8 h-8 flex items-center justify-center bg-white dark:bg-surface-700 rounded-full shadow-soft">
                                  <IconComponent className="w-4 h-4 text-surface-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{participant.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${roleColor}`}>
                                      {participant.role}
                                    </span>
                                    {participant.class && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                                        {participant.class}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-surface-400">
                                      {participant.type === 'sender' ? 'Absender' : 'Empfänger'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {(() => {
                      const firstMessage = conversationMessages[0];
                      const weitereEmpfaenger = firstMessage?.WeitereEmpfaenger;
                      if (weitereEmpfaenger && weitereEmpfaenger.trim() !== '') {
                        return (
                          <div>
                            <h4 className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">Weitere Empfänger</h4>
                            <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-800 rounded-xl p-3">
                              {weitereEmpfaenger}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end p-5 border-t border-surface-100 dark:border-surface-800">
              <button
                onClick={closeParticipantsModal}
                className="btn btn-secondary h-9 text-xs"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
