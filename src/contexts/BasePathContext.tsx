import React, { createContext, useContext } from 'react';

const BasePathContext = createContext<string>('');

export const useBasePath = () => useContext(BasePathContext);

export const BasePathProvider: React.FC<{ basePath: string; children: React.ReactNode }> = ({ basePath, children }) => {
  return (
    <BasePathContext.Provider value={basePath}>
      {children}
    </BasePathContext.Provider>
  );
};
