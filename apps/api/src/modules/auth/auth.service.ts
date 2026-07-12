import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import type { LoginInput, RegisterInput } from "@claimsarathi/shared";

const SALT_ROUNDS = 12;

export class AuthError extends Error {}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
      },
    });

    if (existing) {
      throw new AuthError("an account with this email or phone already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
        locale: input.locale,
      },
    });
  }

  async validateCredentials(input: LoginInput) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: input.identifier }, { phone: input.identifier }],
      },
    });

    if (!user) {
      throw new AuthError("invalid credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AuthError("invalid credentials");
    }

    return user;
  }
}
