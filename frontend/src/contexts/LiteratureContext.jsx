import React, { createContext, useContext } from 'react';
import { useLiterature } from '../hooks/useLiterature.js';

const LiteratureContext = createContext();

export const LiteratureProvider = ({ children, activeTab, searchQuery }) => {
  const literature = useLiterature(activeTab, searchQuery);

  return (
    <LiteratureContext.Provider value={literature}>
      {children}
    </LiteratureContext.Provider>
  );
};

export const useLiteratureContext = () => {
  const context = useContext(LiteratureContext);
  if (!context) {
    throw new Error('useLiteratureContext must be used within LiteratureProvider');
  }
  return context;
};

export default LiteratureContext;
