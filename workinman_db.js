const bcrypt = require("bcrypt");
const e = require("express");

let sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(
  "./workinman_db.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err && err.code === "SQLITE_CANTOPEN") {
      console.log(err);
      createDatabase();
      return;
    } else if (err) {
      console.log("getting error " + err);
      exit(1);
    }
  }
);

const createDatabase = () => {
  let newdb = new sqlite3.Database("./workinman_db.db", (err) => {
    if (err) {
      console.log("Getting error " + err);
      exit(1);
    }
    createTables(newdb);
  });
};

const createTables = (newdb) => {
  newdb.exec(
    `
    create table users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username text not null,
        password text not null,
        salt text not null
    );



    create table questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username text not null,
        question_id text not null,
        question_text text not null,
        correct_answer text not null,
        incorrect_answer1 text not null,
        incorrect_answer2 text not null,
        incorrect_answer3 text not null,
        difficulty_level INTEGER not null, 
        image_name text not null
    );
    `
  );
};

const runQueries = (db, queries) => {
  queries.map((query) => {
    db.all(query, (err, rows) => {
      rows.forEach((row) => {
        console.log(row);
      });
    });
  });
};

const runQuery = (db, query) => {
  db.get(db, query, (err, rows) => {
    console.log(rows);
  });
};

const doesUsernameExistInDbPromise = async (db, username) => {
  const query = `SELECT username FROM users WHERE username = '${username}';`;
  return new Promise((res, rej) => {
    db.get(query, [], (err, rows) => {
      if (err) {
        rej(err);
      } else {
        res(rows);
      }
    });
  });
};
const authenticateUsername = (db, query, usernameValue) => {
  db.get(query, [], (err, row) => {
    console.log(row);
    usernameValue = true;
  });
};

const authenticateUsernamePromise = (db, username) => {
  return new Promise((res, rej) => {
    const query = `select username from users where username='${username}';`;
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

const authenticatePassword = (db, query, passwordValue) => {
  db.get(query, [], (err, row) => {
    console.log(row);
    passwordValue = true;
  });
};
const authenticateUsernameAndPassword = (
  db,
  query,
  usernameAndPasswordAuthenticated
) => {
  db.get(query, [], (err, row) => {
    usernameAndPasswordAuthenticated.push(row);
  });
};
const authenticateUsernameAndPasswordPromise = async (
  db,
  username,
  password
) => {
  const query = `select username from users where username='${username}' AND password='${password}';`;
  return new Promise((res, rej) => {
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

const insertUsernameAndPassword = (
  db,
  username,
  password,
  usernameAndPasswordValue
) => {
  console.log("inside the insert function");
  const insertQuery = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;
  const usernameAndPasswordQuery = `select username from users where username = '${username}' AND password = '${password}';`;
  db.get(insertQuery, [], (err, row) => {
    console.log(row);
    (() => {
      db.get(usernameAndPasswordQuery, [], (err, row) => {
        console.log(row);
      });
    })();
    usernameAndPasswordValue = true;
  });
};

const insertUsernamePasswordSaltPromise = async (
  db,
  username,
  hashedPasswordWithSalt,
  salt
) => {
  const query = `INSERT INTO users (username, password, salt) VALUES ('${username}', '${hashedPasswordWithSalt}', '${salt}');`;
  return new Promise((res, rej) => {
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

const deleteRecordPromise = async (db, username) => {
  const query = `delete from users where username='${username}';`;
  return new Promise((res, rej) => {
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

const getSaltPromise = async (db, username) => {
  const query = `select salt from users where username='${username}';`;
  return new Promise((res, rej) => {
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

const getPasswordAndSaltHash = async (password, salt) => {
  const passwordAndSaltHash = await bcrypt.hash(password, salt);
  return passwordAndSaltHash;
};

const getAllAccountsPromise = async (db) => {
  const query = "SELECT * FROM users;";
  return new Promise((res, rej) => {
    console.log("we are here righ now");
    db.all(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};
const getCountOfAllAccountsPromise = async (db) => {
  const query = "SELECT COUNT(*) FROM users;";
  return new Promise((res, rej) => {
    console.log("we are here righ now");
    db.get(query, [], (err, row) => {
      if (err) {
        rej(err);
      } else {
        res(row);
      }
    });
  });
};

module.exports = {
  db,
  doesUsernameExistInDbPromise,
  getSaltPromise,
  getPasswordAndSaltHash,
  getAllAccountsPromise,
  getCountOfAllAccountsPromise,
  runQuery,
  authenticateUsername,
  authenticateUsernamePromise,
  authenticatePassword,
  authenticateUsernameAndPassword,
  authenticateUsernameAndPasswordPromise,
  deleteRecordPromise,
  insertUsernamePasswordSaltPromise,
};
