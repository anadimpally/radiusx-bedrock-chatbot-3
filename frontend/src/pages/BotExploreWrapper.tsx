import React from 'react';
import useUser from '../hooks/useUser';
import BotExplorePage from './BotExplorePage';

const BotExploreWrapper: React.FC = () => {
  const { isChatbotUser, isAdmin } = useUser(); // Fetch isAdmin dynamically
  return <BotExplorePage isChatbotUser={isChatbotUser} isAdmin={isAdmin}/>;
};

export default BotExploreWrapper;
