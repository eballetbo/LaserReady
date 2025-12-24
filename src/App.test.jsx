import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

describe('App', () => {
    it('renders without crashing', () => {
        // Basic test to verify environment
        render(<App />);
        expect(document.body).toBeDefined();
    });
});
