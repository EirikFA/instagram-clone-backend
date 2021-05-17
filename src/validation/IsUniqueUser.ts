import { Prisma, PrismaClient, User } from "@prisma/client";
import {
  registerDecorator, ValidationArguments, ValidationOptions,
  ValidatorConstraint, ValidatorConstraintInterface
} from "class-validator";
import { Service } from "typedi";

@Service()
@ValidatorConstraint({ async: true })
export class IsUniqueUserConstraint<
  K extends keyof Prisma.UserWhereUniqueInput> implements ValidatorConstraintInterface {
  constructor (private readonly prisma: PrismaClient) {}

  defaultMessage () {
    return "User with $property $value already exists";
  }

  async validate (value: User[K], args: ValidationArguments) {
    const [targetProperty, caseSensitive] = args.constraints as [K, boolean];
    const compare = caseSensitive || typeof value !== "string" ? value : value.toLowerCase();

    const item = await this.prisma.user.findUnique({
      where: {
        [targetProperty]: compare
      }
    });

    return !item;
  }
}

// Consider making obsolete when https://github.com/prisma/prisma/issues/5040 has progress
// Not typed with `PropertyDecorator` because it has weird issues (try it!)
const IsUniqueUser = <K extends keyof User>(
  targetProperty: K,
  caseSensitive: boolean = true,
  options?: ValidationOptions) => (object: Object, propertyName: string) => registerDecorator({
    name: "isUnique",
    target: object.constructor,
    propertyName,
    constraints: [targetProperty, caseSensitive],
    options,
    validator: IsUniqueUserConstraint
  });

export default IsUniqueUser;
