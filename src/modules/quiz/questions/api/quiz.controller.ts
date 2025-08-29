
@Controller('sa/quiz/questions')
@UseGuards(BasicAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    const input: CreateUserDto = {
      login: body.login,
      email: body.email,
      password: body.password,
    };
    const { userId } = await this.commandBus.execute<
      CreateUserByAdminCommand,
      { userId: UUID }
    >(new CreateUserByAdminCommand(input.login, input.password, input.email));
    const user = await this.queryBus.execute<GetUserQuery, UserViewDto>(
      new GetUserQuery(userId),
    );
    return user;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.queryBus.execute(new GetAllUsersQuery(query));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', UuidValidationPipe) id: UUID) {
    return this.commandBus.execute<DeleteUserCommand, void>(
      new DeleteUserCommand(id),
    );
  }
}
