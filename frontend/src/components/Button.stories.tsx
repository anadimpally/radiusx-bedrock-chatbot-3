import { PiList } from 'react-icons/pi';
import Button from './Button';

/**
 * Story for displaying an ideal button.
 */
export const Ideal = () => (
  <Button onClick={() => {}} className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying a loading button.
 */
export const Loading = () => (
  <Button loading onClick={() => {}} className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying a text button.
 */
export const Text = () => (
  <Button onClick={() => {}} text className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying an outlined button.
 */
export const Outlined = () => (
  <Button onClick={() => {}} outlined className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying a disabled button.
 */
export const Disabled = () => (
  <Button onClick={() => {}} disabled className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying a button with an icon.
 */
export const Icon = () => (
  <Button onClick={() => {}} icon={<PiList />} className="px-20 text-xl">
    sample
  </Button>
);

/**
 * Story for displaying a button with a right icon.
 */
export const RightIcon = () => (
  <Button onClick={() => {}} rightIcon={<PiList />} className="px-20 text-xl">
    sample
  </Button>
);
