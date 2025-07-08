import React, { useCallback, useState } from 'react';
import ButtonIcon from './ButtonIcon';
import { BaseProps } from '../@types/common';
import { PiCheck, PiClipboard } from 'react-icons/pi';
import copy from 'copy-to-clipboard';

type Props = BaseProps & {
  text: string;
};

/**
 * Button component for copying text to clipboard.
 *
 * @param {Props} props - The properties for the ButtonCopy component.
 * @returns {JSX.Element} The rendered ButtonCopy component.
 */
const ButtonCopy: React.FC<Props> = (props) => {
  const [showsCheck, setshowsCheck] = useState(false);

  const copyMessage = useCallback((message: string) => {
    copy(message);
    setshowsCheck(true);

    setTimeout(() => {
      setshowsCheck(false);
    }, 3000);
  }, []);

  return (
    <ButtonIcon
      className={props.className}
      onClick={() => {
        copyMessage(props.text);
      }}>
      {showsCheck ? <PiCheck /> : <PiClipboard />}
    </ButtonIcon>
  );
};

export default ButtonCopy;
