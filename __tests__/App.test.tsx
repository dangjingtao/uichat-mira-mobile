/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  it('renders without crashing', async () => {
    let component: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      component = ReactTestRenderer.create(<App />);
    });
    expect(component).toBeDefined();
  });
});
