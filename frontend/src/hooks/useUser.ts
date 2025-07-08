import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

const GROUP_PUBLISH_ALLOWED = 'PublishAllowed';
const GROUP_CREATING_BOT_ALLOWED = 'CreatingBotAllowed';
const GROUP_ADMIN = 'Admin';
const GROUP_USER = 'ChatbotUser'

const useUser = () => {
  const [isAllowApiSettings, setIsAllowApiSettings] = useState(false);
  const [isAllowCreatingBot, setIsAllowCreatingBot] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChatbotUser, setIsChatbotUser] = useState(false);

  const { data: session } = useSWR('current-session', () =>
    fetchAuthSession()
  );

  useEffect(() => {
    const groups = session?.tokens?.idToken?.payload?.['cognito:groups'];

    if (Array.isArray(groups)) {
      setIsAllowApiSettings(groups.some(group =>
        group === GROUP_PUBLISH_ALLOWED || group === GROUP_ADMIN
      ));
      setIsAllowCreatingBot(groups.some(group =>
        group === GROUP_CREATING_BOT_ALLOWED || group === GROUP_ADMIN
      ));
      setIsAdmin(groups.some(group =>
        group === GROUP_ADMIN
      ));
      setIsChatbotUser(groups.some(group =>
        group === GROUP_USER
      ));
    } else {
      setIsAllowApiSettings(false);
      setIsAllowCreatingBot(false);
      setIsAdmin(false);
      setIsChatbotUser(false)
    }
  }, [session]);
  return {
    isAllowApiSettings,
    isAllowCreatingBot,
    isAdmin,
    isChatbotUser
  };
};

export default useUser;
