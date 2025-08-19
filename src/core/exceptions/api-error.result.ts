export class FieldError {
  constructor(
    public message: string,
    public field: string,
  ) {}
}
export class APIErrorResult {
  constructor(public errorsMessages: FieldError[]) {}
}
export class APIErrorResultExt {
  constructor(
    public errorsMessages: FieldError[],
    public message: string,
  ) {}
}
