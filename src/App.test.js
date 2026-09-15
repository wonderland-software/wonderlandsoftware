import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@chenglou/pretext', () => ({
  prepareWithSegments: () => ({}),
  layoutNextLineRange: () => null,
  materializeLineRange: () => ({ text: '', width: 0 }),
}));

const MAILTO =
  "mailto:tag@wonderland.software?subject=Project%20Inquiry&body=Hi%20Tag%2C%0A%0AI'd%20like%20to%20talk%20about%20a%20software%20project.%0A%0A-%20Company%20%2F%20industry%3A%0A-%20What%20we're%20trying%20to%20build%3A%0A-%20Tools%20we%20use%20today%3A%0A-%20Timeline%3A%0A%0AThanks!";

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

test('renders studio wordmark, headline, and contact mailto', () => {
  render(<App />);

  expect(screen.getByText((_, el) => (
    el.classList?.contains('wordmark') && el.textContent.includes('Wonderland Software')
  ))).toBeInTheDocument();
  expect(
    screen.getByRole('heading', {
      name: 'Custom software, built for your business.',
    })
  ).toBeInTheDocument();

  const contact = screen.getByRole('link', {
    name: /email tag@wonderland\.software/i,
  });
  expect(contact).toHaveAttribute('href', MAILTO);
  expect(contact).not.toHaveAttribute('target');
});
