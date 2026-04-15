import React, { createContext, useContext } from 'react';
import { useNews } from '../hooks/useNews.js';

const NewsContext = createContext();

export const NewsProvider = ({ children, activeTab }) => {
  const news = useNews(activeTab);

  return (
    <NewsContext.Provider value={news}>
      {children}
    </NewsContext.Provider>
  );
};

export const useNewsContext = () => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNewsContext must be used within NewsProvider');
  }
  return context;
};

export default NewsContext;
