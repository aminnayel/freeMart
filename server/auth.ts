import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { hashPassword, comparePasswords } from "./password";

export function setupAuth(app: Express) {
    const sessionSettings: session.SessionOptions = {
        secret: "secret",
        resave: false,
        saveUninitialized: false,
        store: undefined, // Default MemoryStore
    };

    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(
            { usernameField: "phoneNumber" },
            async (phoneNumber, password, done) => {
                try {
                    const user = await storage.getUserByPhoneNumber(phoneNumber);
                    if (!user || !user.password) {
                        return done(null, false, { message: "Invalid phone number or password" });
                    } else {
                        const isValid = await comparePasswords(password, user.password);
                        if (!isValid) {
                            return done(null, false, { message: "Invalid phone number or password" });
                        } else {
                            return done(null, user);
                        }
                    }
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((user, done) => done(null, (user as User).id));
    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.post("/api/register", async (req, res, next) => {
        try {
            const existingUser = await storage.getUserByPhoneNumber(req.body.phoneNumber);

            if (existingUser) {
                return res.status(400).send("Phone number already exists");
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.upsertUser({
                ...req.body,
                password: hashedPassword,
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(400).send(info.message || "Login failed");
            req.login(user, (err) => {
                if (err) return next(err);
                res.json(user);
            });
        })(req, res, next);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/auth/user", (req, res) => {
        if (!req.isAuthenticated()) {
            return res.json(null);
        }
        res.json(req.user);
    });
}

export function isAuthenticated(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized" });
}
