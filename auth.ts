import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { User } from '@/app/lib/definitions';
import bcrypt from "bcrypt";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function getUser(email: string): Promise<User | null> {
    try {
        const user = await sql<User[]>`
            SELECT * FROM users WHERE email = ${email}
        `;
        return user[0] || null;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error('Failed to fetch user');
    }
    
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(Credentials) {
                const parsedCredentials = z.object({
                    email: z.string().email(),
                    password: z.string().min(6, "Password must be at least 6 characters long") }).safeParse(Credentials);
                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    const passwordMatch = await bcrypt.compare(password, user.password);
                    
                    if (passwordMatch) return user;
                }
                console.error("Invalid credentials:", parsedCredentials.error);
                return null;
            },
        }),
    ],
});
