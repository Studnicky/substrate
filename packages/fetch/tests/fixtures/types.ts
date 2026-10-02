/**
 * Reusable mock response data for tests
 */

export class Types {
  static readonly mockPostResponse = {
    'body': 'This is a test post body',
    'id': 1,
    'title': 'Test Post',
    'userId': 1
  } as const;

  static readonly mockUserResponse = {
    'email': 'test@example.com',
    'id': 1,
    'name': 'Test User'
  } as const;

  static readonly mockCommentResponse = {
    'body': 'This is a test comment',
    'email': 'commenter@example.com',
    'id': 1,
    'name': 'Test Commenter',
    'postId': 1
  } as const;

  static readonly mockPostListResponse = [
    {
      'body': 'First post body',
      'id': 1,
      'title': 'First Post',
      'userId': 1
    },
    {
      'body': 'Second post body',
      'id': 2,
      'title': 'Second Post',
      'userId': 1
    },
    {
      'body': 'Third post body',
      'id': 3,
      'title': 'Third Post',
      'userId': 2
    }
  ] as const;

  static readonly mockUserListResponse = [
    {
      'email': 'user1@example.com',
      'id': 1,
      'name': 'User One'
    },
    {
      'email': 'user2@example.com',
      'id': 2,
      'name': 'User Two'
    }
  ] as const;

  static readonly mockErrorResponse = {
    'error': 'Not Found',
    'message': 'The requested resource was not found',
    'statusCode': 404
  } as const;

  static readonly mockValidationErrorResponse = {
    'error': 'Validation Error',
    'fields': {
      'email': 'Invalid email format',
      'name': 'Name is required'
    },
    'message': 'Request validation failed',
    'statusCode': 400
  } as const;
}
