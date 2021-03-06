"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");

const {
	NotFoundError,
	BadRequestError,
	UnauthorizedError,
	DuplicationError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

class User {
	static async authenticate(email, password) {
		// try to find the user first
		const result = await db.query(
			`SELECT username,
                  password,
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE email = $1`,
			[email]
		);

		const user = result.rows[0];

		if (user) {
			// compare hashed password to a new hash from password
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid === true) {
				delete user.password;
				return user;
			}
		}
		throw new UnauthorizedError("Invalid username/password");
	}

	static async register({ username, password, email, isAdmin }) {
		const duplicatedUsername = await db.query(
			`SELECT username
			 FROM users
			 WHERE username = $1
			`,
			[username]
		);

		const duplicatedEmail = await db.query(
			`SELECT email
			 FROM users
			 WHERE email = $1
			`,
			[email]
		);

		if (duplicatedUsername.rows[0] || duplicatedEmail.rows[0]) {
			throw new DuplicationError(
				`Duplicated username ${username} or email ${email}`
			);
		}

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

		const result = await db.query(
			`
			INSERT INTO users
			(
				username,
				password,
				email,
				is_admin
			)
			VALUES($1, $2, $3, $4)
			RETURNING username, email, is_admin AS "isAdmin"`,
			[username, hashedPassword, email, isAdmin]
		);

		const user = result.rows[0];

		return user;
	}
}

module.exports = User;
