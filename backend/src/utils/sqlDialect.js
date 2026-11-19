// The few places where MySQL and PostgreSQL (Neon) need different SQL. Everything else in the app is
// written so it runs unchanged on both.
const { Op } = require('sequelize');
const sequelize = require('../db');

const isPostgres = () => sequelize.getDialect() === 'postgres';

// Searches ignore upper/lower case. MySQL's LIKE already does; PostgreSQL needs ILIKE.
const likeOp = () => (isPostgres() ? Op.iLike : Op.like);
const likeSql = () => (isPostgres() ? 'ILIKE' : 'LIKE');

// "YYYY-MM" of a UTC timestamp column, counted in Kigali time (UTC+2).
const kigaliMonth = (column) =>
  isPostgres() ? `to_char(${column} + INTERVAL '2 hours', 'YYYY-MM')` : `DATE_FORMAT(DATE_ADD(${column}, INTERVAL 2 HOUR), '%Y-%m')`;

// Quotes a table or column name the way the database expects (`name` in MySQL, "name" in PostgreSQL).
const quote = (name) => sequelize.getQueryInterface().quoteIdentifier(name);

// Row lock on the main table only. PostgreSQL refuses FOR UPDATE on the optional side of a LEFT JOIN,
// so a query that also loads related rows (include) must say which table it locks.
const lockOf = (transaction, Model) => ({ level: transaction.LOCK.UPDATE, of: Model });

module.exports = { isPostgres, likeOp, likeSql, kigaliMonth, quote, lockOf };
