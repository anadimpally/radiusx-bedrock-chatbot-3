import React, {useEffect} from "react";
import "../src/i18n";
import {GlobalProvider} from "@ladle/react";
import {useLadleContext} from "@ladle/react";
import "../src/index.css";

/**
 * Ladle Global Provider Component
 *
 * This component serves as the wrapper for all Ladle stories, providing global context
 * and theme management. It syncs the Ladle theme state with the application's dark mode
 * by adding or removing the 'dark' class from the document body.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be rendered within the provider
 * @returns {React.ReactElement} The wrapped children with global context
 */
export const Provider: GlobalProvider = ({children}) => {
  // Access the global state from Ladle's context
  const {globalState} = useLadleContext();

  // Effect to sync Ladle's theme state with the document body class
  useEffect(() => {
    const bodyClass = document.body.classList;

    if (globalState.theme === "dark") {
      bodyClass.add("dark");
    } else {
      bodyClass.remove("dark");
    }
  }, [globalState.theme]);

  return <>{children}</>;
};
