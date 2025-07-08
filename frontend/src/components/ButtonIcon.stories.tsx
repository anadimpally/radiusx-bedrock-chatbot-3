import { PiPlus } from 'react-icons/pi';
import ButtonIcon from './ButtonIcon';

/**
 * Story for displaying an ideal ButtonIcon component.
 */
export const Ideal = () => (
  <ButtonIcon onClick={() => {}}>
    <PiPlus />
  </ButtonIcon>
);

/**
 * Story for displaying a disabled ButtonIcon component.
 */
export const Disabled = () => (
  <ButtonIcon disabled onClick={() => {}}>
    <PiPlus />
  </ButtonIcon>
);
