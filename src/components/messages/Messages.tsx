import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI } from '../../services/api';
import { MessageHeader, Message, SearchResult, SendMessageRequest } from '../../types';
import {
  PlusIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  UserIcon,
  InboxArrowDownIcon,
  UsersIcon,
  ChatBubbleLeftIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

const Messages: React.FC = () => {
  const { token } = useAuth();
  // Cached messages state
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
  // Search bar state for messages
  const [messageSearch, setMessageSearch] = useState('');

  // Early return if no token
  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Nicht authentifiziert</h3>
          <p className="text-gray-500">Bitte melden Sie sich an, um Nachrichten zu sehen.</p>
        </div>
      </div>
    );
  }

  // Compose message state
  const [composeData, setComposeData] = useState({
    recipients: [] as SearchResult[],
    subject: '',
    content: '',
  });
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (token) {
      // Show cached state immediately, then update
      loadMessages();
    }
    // eslint-disable-next-line
  }, [token, messageType]);

  const loadMessages = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      setError('');
      const response = await messagesAPI.getMessageHeaders(token, messageType);
      if (response.success) {
        // Transform the API response to match our component expectations
        const transformedMessages = response.conversations.map(msg => ({
          ...msg,
          id: msg.Uniquid, // Use Uniquid for conversation loading
          sender: msg.Sender,
          subject: msg.Betreff,
          unread: msg.private > 0, // Assuming private field indicates unread status
          date: new Date().toISOString(), // Using current date as fallback
        }));
        setMessages(transformedMessages);
        localStorage.setItem('messages_cache', JSON.stringify(transformedMessages));
      } else {
        setError('Fehler beim Laden der Nachrichten.');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Fehler beim Laden der Nachrichten.');
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!token) return;

    try {
      setIsConversationLoading(true);
      setSelectedConversation(conversationId);
      console.log('Loading conversation with ID:', conversationId); // Debug log
      const response = await messagesAPI.getConversation(token, conversationId);
      console.log('Conversation response:', response); // Debug log
      
      if (response.success && response.messages) {
        // Transform the API response to match our component expectations
        const transformedMessages = response.messages.map((msg: any) => ({
          id: msg.Id || msg.id,
          sender: msg.username || msg.Sender || 'Unbekannter Sender',
          content: msg.Inhalt || msg.content || '',
          date: msg.Datum || msg.date || new Date().toISOString(),
          ...msg // Keep all original fields for debugging
        }));
        setConversationMessages(transformedMessages);
        setError(''); // Clear any previous errors
      } else {
        // Handle specific API error cases
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
        loadMessages(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Fehler beim Senden der Nachricht.');
    } finally {
      setIsSending(false);
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

  // Show cached state immediately, but if no cached and loading, show skeleton
  if (isLoading && (!messages || messages.length === 0)) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Messages list */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Nachrichten</h1>
            <button
              onClick={() => setShowCompose(true)}
              className="btn btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Neue Nachricht
            </button>
          </div>

          {/* Message type filter */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-3">
            {(['All', 'Unread', 'Sent'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMessageType(type)}
                className={clsx(
                  'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
                  messageType === type
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {type === 'All' ? 'Alle' : type === 'Unread' ? 'Ungelesen' : 'Gesendet'}
              </button>
            ))}
          </div>

          {/* Search bar for messages */}
          <div className="mb-2">
            <input
              type="text"
              className="input w-full"
              placeholder="Nachrichten durchsuchen... (Betreff, Absender, Empfänger)"
              value={messageSearch}
              onChange={e => setMessageSearch(e.target.value)}
            />
          </div>
        </div>
        {/* Spinner indicator for updating */}
        {isUpdating && (
          <div className="flex items-center gap-2 px-4 py-2 text-primary-600">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 inline-block"></span>
            <span>Aktualisiere...</span>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {messages && messages.length === 0 ? (
            <div className="p-8 text-center">
              <InboxArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Keine Nachrichten</h3>
              <p className="mt-1 text-sm text-gray-500">
                {messageType === 'Unread' ? 'Keine ungelesenen Nachrichten vorhanden.' : 'Keine Nachrichten vorhanden.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(messages && messages
                .filter(message => {
                  if (!messageSearch.trim()) return true;
                  const search = messageSearch.toLowerCase();
                  // Search in subject, sender, and recipients (empf)
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
                    key={message.id}
                    className={clsx(
                      'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                      selectedConversation === message.Uniquid && 'bg-primary-50',
                      message.unread && 'font-semibold'
                    )}
                    onClick={() => loadConversation(message.Uniquid)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <UserIcon className="h-8 w-8 text-gray-400 flex-shrink-0 mr-3" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Sender {message.Sender}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {message.Betreff}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-xs text-gray-500">
                          {message.date ? formatDate(message.date) : 'Heute'}
                        </p>
                        {message.unread && (
                          <div className="w-2 h-2 bg-primary-600 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  </div>
                )))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="border-b border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-gray-900">
                    {messages.find(m => m.Uniquid === selectedConversation)?.Betreff || 'Unterhaltung'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowParticipants(true)}
                  className="btn btn-secondary flex items-center"
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Teilnehmer anzeigen
                </button>
              </div>
            </div>

            {isConversationLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversationMessages && conversationMessages.map((message) => (
                  <div key={message.id} className="card">
                    <div className="flex items-start">
                      <UserIcon className="h-8 w-8 text-gray-400 flex-shrink-0 mr-3" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900">
                            {message.sender}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(message.date)}
                          </p>
                        </div>
                        <div 
                          className="prose text-sm text-gray-700 max-w-none"
                          dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <InboxArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">Wählen Sie eine Nachricht aus, um sie anzuzeigen</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Neue Nachricht</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empfänger
                </label>
                <div className="space-y-2">
                  {/* Selected recipients */}
                  {composeData.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {composeData.recipients.map((recipient) => (
                        <span
                          key={recipient.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                        >
                          {recipient.name}
                          <button
                            onClick={() => removeRecipient(recipient.id)}
                            className="ml-2 text-primary-600 hover:text-primary-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Search input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Empfänger suchen..."
                      className="input"
                      value={recipientSearch}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value);
                        searchRecipients(e.target.value);
                      }}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => addRecipient(result)}
                          className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{result.name}</div>
                          <div className="text-sm text-gray-500">{result.username}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betreff
                </label>
                <input
                  type="text"
                  className="input"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nachricht
                </label>
                <textarea
                  rows={8}
                  className="input"
                  value={composeData.content}
                  onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCompose(false)}
                className="btn btn-secondary"
              >
                Abbrechen
              </button>
              <button
                onClick={sendMessage}
                disabled={isSending || composeData.recipients.length === 0 || !composeData.subject.trim() || !composeData.content.trim()}
                className="btn btn-primary disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Senden...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Senden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants modal */}
      {showParticipants && selectedConversation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4 max-h-[60vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Teilnehmer</h3>
              <button
                onClick={closeParticipantsModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {(() => {
                // Get statistics from the first message in the conversation
                const conversationMessage = conversationMessages.find(msg => msg.statistik);
                const stats = conversationMessage?.statistik;
                
                // Get the original message header data to access all recipients
                const messageHeader = messages.find(m => m.Uniquid === selectedConversation);
                
                if (!stats && !messageHeader) {
                  return (
                    <div className="text-center py-8">
                      <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">
                        Keine Teilnehmerinformationen verfügbar
                      </p>
                    </div>
                  );
                }

                // Get all participants from the message header
                const getAllParticipants = () => {
                  const participants = new Map();
                  
                  // Add sender
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
                  
                  // Add all recipients from empf array
                  if (messageHeader?.empf && Array.isArray(messageHeader.empf)) {
                    messageHeader.empf.forEach((recipient, index) => {
                      // Parse the HTML span to extract name and class
                      const cleanText = recipient.replace(/<[^>]*>/g, '').trim();
                      // Extract name and class from format like "Wegener, Bennet Joan (09B)"
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
                
                // Filter participants by search
                const filteredParticipants = allParticipants.filter(participant => 
                  participantSearch === '' || 
                  participant.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                  (participant.class && participant.class.toLowerCase().includes(participantSearch.toLowerCase()))
                );

                return (
                  <div className="space-y-4">
                    {stats && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Übersicht</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">Teilnehmer:</span>
                            <span className="font-medium ml-1">{stats.teilnehmer}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">Betreuer:</span>
                            <span className="font-medium ml-1">{stats.betreuer}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">Eltern:</span>
                            <span className="font-medium ml-1">{stats.eltern}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">Gesamt:</span>
                            <span className="font-medium ml-1">{stats.teilnehmer + stats.betreuer + stats.eltern}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-sm">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                            <span className="text-gray-600">Alle Teilnehmer:</span>
                            <span className="font-medium ml-1">{allParticipants.length}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Search input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teilnehmer suchen
                      </label>
                      <input
                        type="text"
                        placeholder="Name oder Klasse eingeben..."
                        className="input"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          Alle Teilnehmer
                        </h4>
                        <span className="text-xs text-gray-500">
                          {filteredParticipants.length} von {allParticipants.length} Teilnehmern
                        </span>
                      </div>
                      <div className="space-y-2">
                        {filteredParticipants.length === 0 && participantSearch !== '' ? (
                          <div className="text-center py-8">
                            <UserIcon className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-500">
                              Keine Teilnehmer gefunden für "{participantSearch}"
                            </p>
                          </div>
                        ) : (
                          filteredParticipants.map((participant, index) => {
                            // Determine the color based on participant type and role
                            let roleColor = 'bg-gray-100 text-gray-800';
                            // Icon component to render for the participant
                            let IconComponent = UserIcon;
                            
                            if (participant.type === 'sender') {
                              roleColor = 'bg-green-100 text-green-800';
                              IconComponent = ChatBubbleLeftIcon;
                            } else {
                              roleColor = 'bg-blue-100 text-blue-800';
                              IconComponent = UserIcon;
                            }
                            
                            if (participant.role === 'Betreuer') {
                              roleColor = 'bg-purple-100 text-purple-800';
                              IconComponent = AcademicCapIcon;
                            }
                            
                            return (
                              <div key={participant.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="h-8 w-8 flex items-center justify-center bg-gray-200 rounded-full text-sm mr-3">
                                  <IconComponent className="h-5 w-5 text-gray-700" aria-hidden />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColor}`}>
                                      {participant.role}
                                    </span>
                                    {participant.class && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {participant.class}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
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

                    {/* Additional recipients info if available */}
                    {(() => {
                      const firstMessage = conversationMessages[0];
                      const weitereEmpfaenger = firstMessage?.WeitereEmpfaenger;
                      
                      if (weitereEmpfaenger && weitereEmpfaenger.trim() !== '') {
                        return (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Weitere Empfänger</h4>
                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
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

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeParticipantsModal}
                className="btn btn-secondary"
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