import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router'
import './index.css'
import { AppLayout } from './routes/AppLayout'
import { CropsPage } from './routes/CropsPage'
import { CropLayout } from './routes/CropLayout'
import { ExpensesPage } from './routes/ExpensesPage'
import { MembersPage } from './routes/MembersPage'
import { HarvestPage } from './routes/HarvestPage'
import { SummaryPage } from './routes/SummaryPage'
import { SettingsPage } from './routes/SettingsPage'

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <CropsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        {
          path: 'crop/:cropId',
          element: <CropLayout />,
          children: [
            { index: true, element: <Navigate to="expenses" replace /> },
            { path: 'expenses', element: <ExpensesPage /> },
            { path: 'members', element: <MembersPage /> },
            { path: 'harvest', element: <HarvestPage /> },
            { path: 'summary', element: <SummaryPage /> },
          ],
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  // Served from a GitHub Pages subpath, so the router must know its prefix.
  { basename: import.meta.env.BASE_URL }
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
