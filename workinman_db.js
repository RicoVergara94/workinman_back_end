const e = require("express");

let sqlite3 = require("sqlite3").verbose();

let db = new sqlite3.Database(
  "./workinman_db.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err && err.code === "SQLITE_CANTOPEN") {
      console.log("we're inside here right now");
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
      // console.log("We're inside here right now " + err);
      console.log("Getting error " + err);
      exit(1);
    }
    createTables(newdb);
  });
};

const createTables = (newdb) => {
  // may need to make id not null again if autoincrement doesn't work
  newdb.exec(
    `
    create table users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username text not null,
        password text not null,
        salt text not null
    );
    insert into users (username, password, salt)
        values ('oscar.vergara1994@gmail.com', 'Hello123', 'saltOne'),
               ('ricardo.vergara1994@gmail.com', 'password123', 'saltTwo'),
               ('rico.vergara1994@gmail.com', 'Hakuna', 'saltThree');

    `
  );
};

const runQueries = (db, queries) => {
  queries.map((query) => {
    db.all(query, (err, rows) => {
      // console.log("this is rows: " + rows);
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

// const authenticate = (db, query) => {
//   db.get(query, [], (res) => {
//     console.log(res);
//   });
// };
const authenticateUsername = (db, query, usernameValue) => {
  db.get(query, [], (err, row) => {
    console.log(row);
    usernameValue = true;
  });
};
const authenticatePassword = (db, query, passwordValue) => {
  db.get(query, [], (err, row) => {
    console.log(row);
    passwordValue = true;
  });
};
const authenticateUsernameAndPassword = (
  // may not need this function any longer
  db,
  query,
  usernameAndPasswordAuthenticated
) => {
  db.get(query, [], (err, row) => {
    usernameAndPasswordAuthenticated.push(row);
  });
};
const authenticateUsernameAndPasswordPromise = (db, query) => {
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

const insertUsernamePasswordSaltPromise = (db, query) => {
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
// const runQueries = (db, query) => {
//   query.map((row) => {
//     db.run(row, [], () => console.log(row));
//   });
// };
// createTables(db);
// runQueries(db);

// if (runQueries(db)) {
//   console.log("the value isn't null");
// } else {
//   console.log("value is null");
// }

// if (runFooQueries(db)) {
//   console.log("the value isn't null");
// } else {
//   console.log("value is null");
// }

// const queries = [
//   `
// select username from users where username = 'oscar.vergara1994@gmail.com';
// `,
//   `
// select password from users where password = 'Hello123';
// `,
// ];

// queries.map((query) => runQueries(db, query));

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
  getAllAccountsPromise,
  getCountOfAllAccountsPromise,
  runQuery,
  authenticateUsername,
  authenticatePassword,
  authenticateUsernameAndPassword,
  authenticateUsernameAndPasswordPromise,
  insertUsernamePasswordSaltPromise,
};
