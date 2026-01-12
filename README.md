# Expensify

A comprehensive financial dashboard visualizing monthly expenses by category, date, and weekday using interactive charts. Built with React, Tailwind CSS, and Recharts.

## Features

- **Dashboard**: Visualizes total expenses, category breakdown, and spending trends.
- **Interactive Charts**: Area charts for daily trends, Pie charts for categories, and Bar charts for weekly analysis.
- **Dark Mode**: Fully supported dark mode that respects system preferences by default.
- **Responsive**: Optimized for mobile and desktop viewing.

## Deployment on Vercel

This application is ready to be deployed on [Vercel](https://vercel.com).

### Prerequisites

- A Vercel account.
- The Supabase API Key (if you are using your own backend) or the provided demo key.

### Steps to Deploy

1.  **Push to Git**: Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).
2.  **Import Project**: Log in to Vercel and click "Add New..." -> "Project". Select your repository.
3.  **Configure Project**:
    *   **Framework Preset**: Create React App (or Vite, depending on your build setup. If standard React, 'Create React App' is fine. If using the provided simple setup, Vercel usually detects it automatically).
    *   **Root Directory**: `./`
4.  **Environment Variables**:
    Expand the "Environment Variables" section and add the following:
    
    *   `REACT_APP_SUPABASE_KEY`: `your_supabase_api_key_here`
    *   `REACT_APP_API_BASE_URL`: `your_api_base_url_here`
    
    *(Note: If you are using the demo backend, you can skip these as the code has defaults, but it is best practice to set them).*

5.  **Deploy**: Click "Deploy". Vercel will build and launch your application.

### Environment Variables

| Variable | Description |
| :--- | :--- |
| `REACT_APP_SUPABASE_KEY` | The API Key for the Supabase Function to retrieve transaction data. |
| `REACT_APP_API_BASE_URL` | The base URL for the API (e.g., `https://project.supabase.co/functions/v1`). |

## Local Development

1.  Clone the repository.
2.  Install dependencies (if using a package manager like npm/yarn - though this specific demo uses ESM imports via CDN for simplicity).
3.  Serve the file (e.g., using `npx serve` or Live Server).

## Tech Stack

- **React**: UI Library
- **Tailwind CSS**: Styling (Dark mode supported via `class` strategy)
- **Recharts**: Data Visualization
- **Supabase**: Backend Functions (API)
