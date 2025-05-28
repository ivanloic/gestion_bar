// src/contexts/ActiveBarContext.js
import React, { createContext, useContext, useState } from 'react';

const ActiveBarContext = createContext();

export function ActiveBarProvider({ children }) {
  const [activeBar, setActiveBar] = useState(null);

  return (
    <ActiveBarContext.Provider value={{ activeBar, setActiveBar }}>
      {children}
    </ActiveBarContext.Provider>
  );
}

export function useActiveBar() {
  return useContext(ActiveBarContext);
}