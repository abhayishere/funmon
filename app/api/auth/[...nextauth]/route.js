// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { access_type: "offline", prompt: "consent",include_granted_scopes: "true"
      } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // When signing in, store tokens from the provider.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at; // seconds epoch time
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub;
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);

// Export named HTTP method handlers.
export { handler as GET, handler as POST };
