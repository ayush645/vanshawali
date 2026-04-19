# Admin Dashboard

A comprehensive, responsive admin dashboard built with Next.js, Tailwind CSS, and Axios for managing users, communities, and system statistics.

## Features

### 1. Dashboard Overview
- **Real-time Statistics**: Display total users, communities, premium users, family tree members, and memories
- **Data Cards**: Clean, card-based layout showing key metrics
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

### 2. Users Management
- **User List**: View all users with filtering and search capabilities
- **User Details**: Click on any user to view comprehensive profile information
- **User Actions**:
  - Block/Unblock users
  - Delete users with confirmation
  - View detailed user profiles
- **Search**: Filter users by name or email

### 3. Communities Management
- **Community List**: View all communities in the system
- **Community Actions**:
  - Edit community name
  - Delete communities with confirmation
  - View community members
- **Community Members**: See all users belonging to a specific community

### 4. Authentication
- **JWT-based Authentication**: Secure admin-only access
- **Login Page**: Email and password-based login
- **Token Management**: Tokens stored in localStorage for persistent sessions
- **Protected Routes**: Admin dashboard routes require valid authentication

## Project Structure

```
app/
├── page.tsx                          # Redirect to admin dashboard
├── login/
│   └── page.tsx                      # Admin login page
└── admin/
    ├── layout.tsx                    # Admin layout with sidebar & header
    ├── dashboard/
    │   └── page.tsx                  # Dashboard overview with stats
    ├── users/
    │   ├── page.tsx                  # Users list & management
    │   └── [id]/
    │       └── page.tsx              # User detail page
    └── communities/
        ├── page.tsx                  # Communities list
        ├── [id]/
        │   ├── edit/
        │   │   └── page.tsx          # Edit community page
        │   └── users/
        │       └── page.tsx          # Community members page
        
components/
├── admin/
│   ├── sidebar.tsx                   # Navigation sidebar
│   ├── header.tsx                    # Header with user menu
│   ├── delete-user-dialog.tsx        # User deletion confirmation
│   ├── block-user-dialog.tsx         # User block/unblock confirmation
│   └── delete-community-dialog.tsx   # Community deletion confirmation
└── ui/                               # shadcn/ui components (pre-configured)

hooks/
├── use-auth.ts                       # Authentication hook for protected routes
├── use-mobile.ts                     # Mobile detection hook
└── use-toast.ts                      # Toast notification hook
```

## API Integration

The dashboard connects to the following backend API endpoints:

### Authentication
- **POST** `/api/admin/login` - Admin login with JWT token

### Dashboard
- **GET** `/api/admin/dashboard` - Fetch dashboard statistics

### Users Management
- **GET** `/api/admin/users` - Get all users
- **GET** `/api/admin/users/:id` - Get single user details
- **PATCH** `/api/admin/users/:id/block` - Block/Unblock user
- **DELETE** `/api/admin/users/:id` - Delete user (soft delete)

### Communities Management
- **GET** `/api/admin/communities` - Get all communities
- **GET** `/api/admin/communities/:id/users` - Get community members
- **PUT** `/api/admin/communities/:id` - Update community
- **DELETE** `/api/admin/communities/:id` - Delete community (soft delete)

## Getting Started

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables** (if needed):
   Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_API_URL=https://api.vanshawali.tatvagyaan.in
   ```

3. **Run the development server**:
   ```bash
   pnpm dev
   ```

4. **Open your browser**:
   Navigate to `https://api.vanshawali.tatvagyaan.in`

### Login

1. Visit `https://api.vanshawali.tatvagyaan.in/login`
2. Enter your admin credentials
3. On successful login, you'll be redirected to the dashboard
4. The JWT token will be stored in localStorage for subsequent requests

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Form Handling**: React Hook Form
- **Charts**: Recharts (pre-configured)

## Features in Detail

### Authentication Flow
1. User visits `/login`
2. Enters email and password
3. API validates credentials and returns JWT token
4. Token is stored in localStorage
5. User is redirected to `/admin/dashboard`
6. All subsequent API calls include the token in `Authorization: Bearer <token>` header

### Protected Routes
- Admin routes check for valid JWT token in localStorage
- If token is missing, user is redirected to login page
- Authentication check happens on layout load

### Data Fetching
- Uses Axios for all API calls
- Automatically includes JWT token in request headers
- Proper error handling with user-friendly error messages
- Loading states with skeleton components

### User Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Loading States**: Skeleton loaders while data is being fetched
- **Error Handling**: Informative error messages and alerts
- **Confirmation Dialogs**: Actions like delete/block require confirmation
- **Search & Filter**: Quick access to specific users or communities

## Customization

### Adding New Admin Pages
1. Create a new folder under `/app/admin/[feature-name]/`
2. Add a `page.tsx` file with your component
3. Update the sidebar navigation in `/components/admin/sidebar.tsx`
4. Make API calls using the `useAuth` hook for token management

### Styling
- All components use Tailwind CSS
- Design tokens are defined in `tailwind.config.ts` and `app/globals.css`
- Components can be customized by modifying the shadcn/ui components in `/components/ui/`

### API Configuration
- Base API URL is hardcoded in components (update if needed)
- Axios interceptors can be added for global error handling
- Create a dedicated API client file for better organization

## Error Handling

The dashboard includes robust error handling:
- Network errors display user-friendly messages
- Failed API requests show alert dialogs
- Loading states prevent duplicate submissions
- Form validation on login page

## Performance Optimizations

- **Code Splitting**: Each page loads only necessary code
- **Image Optimization**: Next.js automatic image optimization
- **Caching**: Axios can be configured with caching strategies
- **Skeleton Loaders**: Improved perceived performance

## Security Considerations

- **JWT Authentication**: Secure token-based authentication
- **XSS Protection**: React's built-in XSS protection
- **CSRF Prevention**: HTTP-only cookies can be implemented
- **Token Storage**: Currently using localStorage (consider upgrading to secure storage)

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Login Issues
- Verify backend API is running on `https://api.vanshawali.tatvagyaan.in/api`
- Check browser console for detailed error messages
- Ensure credentials are correct

### Data Not Loading
- Check network tab in browser DevTools
- Verify JWT token is present in localStorage
- Ensure backend API endpoints are correct

### Styling Issues
- Clear browser cache and rebuild
- Verify Tailwind CSS is properly configured
- Check for CSS conflicts with existing styles

## Future Enhancements

- Add pagination for large data sets
- Implement advanced filtering options
- Add analytics and reporting features
- Create audit logs for user actions
- Implement role-based access control (RBAC)
- Add bulk actions for users and communities
- Export data to CSV/PDF

## Support

For issues, questions, or feature requests, contact the development team or check the documentation.

---

**Version**: 1.0.0  
**Last Updated**: February 2026
