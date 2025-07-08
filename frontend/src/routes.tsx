import App from './App.tsx'; // Main application component
import ChatPage from './pages/ChatPage.tsx'; // Chat page component
import NotFound from './pages/NotFound.tsx'; // Not found page component
import BotKbEditPage from './features/knowledgeBase/pages/BotKbEditPage.tsx'; // Bot knowledge base edit page
import BotApiSettingsPage from './pages/BotApiSettingsPage.tsx'; // Bot API settings page
import AdminSharedBotAnalyticsPage from './pages/AdminSharedBotAnalyticsPage.tsx'; // Admin shared bot analytics page
import AdminApiManagementPage from './pages/AdminApiManagementPage.tsx'; // Admin API management page
import AdminBotManagementPage from './pages/AdminBotManagementPage.tsx'; // Admin bot management page
import { useTranslation } from 'react-i18next'; // Hook for translation
import {
  createBrowserRouter,
  matchRoutes,
  RouteObject,
  useLocation,
} from 'react-router-dom'; // React Router DOM utilities
import { useMemo } from 'react'; // React hook for memoization
import BotExploreWrapper from "./pages/BotExploreWrapper.tsx"; // Bot explore wrapper page

// Defining the routes for the application
const rootChildren = [
  {
    path: '/',
    element: <ChatPage />, // Default route to ChatPage
  },
  {
    path: '/bot/explore',
    element: <BotExploreWrapper/>, // Route to BotExploreWrapper
  },
  {
    path: '/bot/new',
    element: <BotKbEditPage />, // Route to BotKbEditPage for new bot
  },
  {
    path: '/bot/edit/:botId',
    element: <BotKbEditPage />, // Route to BotKbEditPage for editing a bot
  },
  {
    path: '/bot/api-settings/:botId',
    element: <BotApiSettingsPage />, // Route to BotApiSettingsPage
  },
  {
    path: '/bot/:botId',
    element: <ChatPage />, // Route to ChatPage for a specific bot
  },
  {
    path: '/admin/shared-bot-analytics',
    element: <AdminSharedBotAnalyticsPage />, // Route to AdminSharedBotAnalyticsPage
  },
  {
    path: '/admin/api-management',
    element: <AdminApiManagementPage />, // Route to AdminApiManagementPage
  },
  {
    path: '/admin/bot/:botId',
    element: <AdminBotManagementPage />, // Route to AdminBotManagementPage
  },
  {
    path: '/:conversationId',
    element: <ChatPage />, // Route to ChatPage for a specific conversation
  },
  {
    path: '*',
    element: <NotFound />, // Catch-all route for 404 NotFound
  },
] as const;

// Defining the main routes structure
const routes = [
  {
    path: '/',
    element: <App />, // Main application component
    children: rootChildren, // Nested routes
  },
];

type AllPaths = (typeof rootChildren)[number]['path']; // Type for all paths

// Function to get all paths from the routes
const getAllPaths = (routes: typeof rootChildren): AllPaths[] =>
  routes.map(({ path }) => path);

export const allPaths = getAllPaths(rootChildren); // Exporting all paths

// Hook to get page labels for specific routes
export const usePageLabel = () => {
  const { t } = useTranslation(); // Translation hook
  const pageLabel: { path: (typeof allPaths)[number]; label: string }[] = [
    { path: '/bot/explore', label: t('bot.explore.label.pageTitle') },
    {
      path: '/admin/shared-bot-analytics',
      label: t('admin.sharedBotAnalytics.label.pageTitle'),
    },
    {
      path: '/admin/api-management',
      label: t('admin.apiManagement.label.pageTitle'),
    },
  ];

  // Function to get the label for a specific page path
  const getPageLabel = (pagePath: (typeof allPaths)[number]) =>
    pageLabel.find(({ path }) => path === pagePath)?.label;
  return { pageLabel, getPageLabel };
};

// Creating the router with the defined routes
export const router = createBrowserRouter(routes as unknown as RouteObject[]);

type ConversationRoutes = { path: (typeof allPaths)[number] }[];

// Hook to determine the current page's path pattern
export const usePageTitlePathPattern = () => {
  const location = useLocation(); // Hook to get the current location

  // Defining conversation-related routes
  const conversationRoutes: ConversationRoutes = useMemo(
    () => [
      { path: '/:conversationId' },
      { path: '/bot/:botId' },
      { path: '/' },
      { path: '*' },
    ],
    []
  );

  // Filtering out non-conversation routes
  const notConversationRoutes = useMemo(
    () =>
      allPaths
        .filter(
          (pattern) => !conversationRoutes.find(({ path }) => path === pattern)
        )
        .map((pattern) => ({ path: pattern })),
    [conversationRoutes]
  );

  // Matching the current location to the defined routes
  const matchedRoutes = useMemo(() => {
    return matchRoutes(notConversationRoutes, location);
  }, [location, notConversationRoutes]);

  // Determining the path pattern for the current route
  const pathPattern = useMemo(
    () => matchedRoutes?.[0]?.route.path ?? '/',
    [matchedRoutes]
  );

  // Checking if the current route is a conversation or new chat
  const isConversationOrNewChat = useMemo(
    () => !matchedRoutes?.length,
    [matchedRoutes]
  );
  return { isConversationOrNewChat, pathPattern };
};
