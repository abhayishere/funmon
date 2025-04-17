import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user, trigger }) {
      if (account) {
        console.log("New login detected. Updating token...");
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.userId = user?.id || token.userId;
        console.log("JWT CALLBACK ::", { token, account });

      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      session.user.id = token.userId || token.sub;
      console.log("SESSION CALLBACK ::", { session, token });
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
};