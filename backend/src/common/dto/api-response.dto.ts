export class ApiResponseDto<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}
