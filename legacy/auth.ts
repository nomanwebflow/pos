import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import type { User as PrismaUser } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      businessId: string
      emailVerified: Date | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    businessId: string
    emailVerified?: Date | null
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    role: string
    businessId: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Query user from database
          const user = db.prepare(
            "SELECT * FROM User WHERE email = ? AND isActive = 1"
          ).get(credentials.email) as PrismaUser | undefined

          if (!user) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            businessId: user.businessId
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.businessId = user.businessId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role,
          businessId: token.businessId,
          emailVerified: null
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || "your-secret-key-change-this-in-production",
})
