/**
 * Reusable mock response data for tests
 */

/**
 * Mock post data for testing
 */
type MockPostType = {
  body: string;
  id: number;
  title: string;
  userId: number;
};

/**
 * Mock user data for testing
 */
type MockUserType = {
  email: string;
  id: number;
  name: string;
};

/**
 * Mock comment data for testing
 */
type MockCommentType = {
  body: string;
  email: string;
  id: number;
  name: string;
  postId: number;
};

export const mockPostResponse = {
  body: 'This is a test post body',
  id: 1,
  title: 'Test Post',
  userId: 1
} as const satisfies MockPostType;

export const mockUserResponse = {
  email: 'test@example.com',
  id: 1,
  name: 'Test User'
} as const satisfies MockUserType;

export const mockCommentResponse = {
  body: 'This is a test comment',
  email: 'commenter@example.com',
  id: 1,
  name: 'Test Commenter',
  postId: 1
} as const satisfies MockCommentType;

export const mockPostListResponse = [
  {
    body: 'First post body',
    id: 1,
    title: 'First Post',
    userId: 1
  },
  {
    body: 'Second post body',
    id: 2,
    title: 'Second Post',
    userId: 1
  },
  {
    body: 'Third post body',
    id: 3,
    title: 'Third Post',
    userId: 2
  }
] as const satisfies readonly MockPostType[];

export const mockUserListResponse = [
  {
    email: 'user1@example.com',
    id: 1,
    name: 'User One'
  },
  {
    email: 'user2@example.com',
    id: 2,
    name: 'User Two'
  }
] as const satisfies readonly MockUserType[];

export const mockErrorResponse = {
  error: 'Not Found',
  message: 'The requested resource was not found',
  statusCode: 404
} as const;

export const mockValidationErrorResponse = {
  error: 'Validation Error',
  fields: {
    email: 'Invalid email format',
    name: 'Name is required'
  },
  message: 'Request validation failed',
  statusCode: 400
} as const;
