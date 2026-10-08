import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@chenglou/pretext', () => ({
  prepareWithSegments: () => ({}),
  layoutNextLineRange: () => null,
  materializeLineRange: () => ({ text: '', width: 0 }),
}));

beforeAll(() => {
  // jsdom has no canvas; skip WebGL/2d so the page can render in tests.
  HTMLCanvasElement.prototype.getContext = () => null;
  window.matchMedia = (query) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
});

test('renders Wonderland identity, Vibrate focus, and contact mailto', () => {
  render(<App />);

  expect(screen.getByText((_, el) => (
    el.classList?.contains('wordmark') && el.textContent.includes('Wonderland Software')
  ))).toBeInTheDocument();
  expect(screen.getByText('Austin, Texas')).toBeInTheDocument();
  expect(
    screen.getByRole('heading', {
      name: 'Currently building Vibrate',
    })
  ).toBeInTheDocument();

  const contact = screen.getByRole('link', {
    name: /email tag@wonderland\.software/i,
  });
  expect(contact).toHaveAttribute('href', 'mailto:tag@wonderland.software');
  expect(contact).not.toHaveAttribute('target');

  const vibrateLogo = screen.getByAltText('Vibrate logo');
  expect(vibrateLogo).toHaveAttribute('width');
  expect(vibrateLogo).toHaveAttribute('height');
  expect(screen.getByRole('link', { name: /visit vibrate\.world/i })).toHaveAttribute(
    'href',
    'https://vibrate.world'
  );
  expect(screen.queryByRole('link', { name: /available on testflight/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Trusted by')).not.toBeInTheDocument();
});
