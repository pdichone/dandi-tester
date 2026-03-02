import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "../../../lib/supabaseClient";
import type { UserRole } from "@/app/lib/auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add role to session from token
      if (session.user && token.role) {
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      // Fetch role from database when user signs in or session is accessed
      if (user?.email || token.email) {
        const email = user?.email || token.email;
        if (email) {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .single();
          
          if (data?.role) {
            token.role = data.role as UserRole;
          } else {
            token.role = 'user'; // Default role
          }
        }
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      const { data, error } = await supabase
        .from('users')
        .select()
        .eq('email', user.email)
        .single();

      if (error || !data) {
        // User doesn't exist, so add them to the database with default 'user' role
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            name: user.name,
            image: user.image,
            role: 'user', // Default role for new users
          });

        if (insertError) {
          console.error('Error adding user to database:', insertError);
        }
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

