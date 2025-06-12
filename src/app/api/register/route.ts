// import NextAuth from "next-auth";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import { PrismaClient } from "@prisma/client";
// import CredentialsProvider from "next-auth/providers/credentials";
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// const handler = NextAuth({
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     CredentialsProvider({
//       name: "credentials",
//       credentials: {
//         email: { label: "Email", type: "email" },
//         password: { label: "Password", type: "password" }
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           return null;
//         }

//         const user = await prisma.user.findUnique({
//           where: {
//             email: credentials.email.toLowerCase()
//           }
//         });

//         if (!user || !user.password) {
//           return null;
//         }

//         const isPasswordValid = await bcrypt.compare(
//           credentials.password,
//           user.password
//         );

//         if (!isPasswordValid) {
//           return null;
//         }

//         return {
//           id: user.id,
//           email: user.email,
//           name: `${user.name} ${user.surname}`,
//           firstName: user.name,
//           lastName: user.surname,
//         };
//       }
//     }),
//     // Optional: Add Strava provider
//     // {
//     //   id: "strava",
//     //   name: "Strava",
//     //   type: "oauth",
//     //   authorization: {
//     //     url: "https://www.strava.com/oauth/authorize",
//     //     params: {
//     //       scope: "read,activity:read",
//     //       response_type: "code",
//     //     },
//     //   },
//     //   token: "https://www.strava.com/oauth/token",
//     //   userinfo: "https://www.strava.com/api/v3/athlete",
//     //   clientId: process.env.STRAVA_CLIENT_ID,
//     //   clientSecret: process.env.STRAVA_CLIENT_SECRET,
//     //   profile(profile) {
//     //     return {
//     //       id: profile.id.toString(),
//     //       name: `${profile.firstname} ${profile.lastname}`,
//     //       email: profile.email,
//     //       image: profile.profile,
//     //     };
//     //   },
//     // },
//   ],
//   session: {
//     strategy: "jwt",
//   },
//   pages: {
//     signIn: "/", // Redirect to your home page
//   },
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.name = user.name;
//         token.surname = user.surname;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (token) {
//         session.user.id = token.sub!;
//         session.user?.name = token.name as string;
//         session.user.surname = token.surname as string;
//       }
//       return session;
//     },
//   },
// });

// export { handler as GET, handler as POST };


import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, dateOfBirth } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: "User created successfully", 
        user: userWithoutPassword 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}