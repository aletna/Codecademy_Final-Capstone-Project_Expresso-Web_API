const express = require('express');
const employeesRouter = express.Router();

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

/* --- /employees --- */

const valTimesheet = (req, res, next) => {
  const ts = req.body.timesheet;
  if (!ts.hours || !ts.rate || !ts.date) {
    return res.sendStatus(400);
  }
  next();
}


//employeeId param
employeesRouter.param('employeeId', (req, res, next, employeeId) => {
  const sql = 'SELECT * FROM Employee WHERE Employee.id = $employeeId';
  const values = {$employeeId: employeeId};
  db.get(sql, values, (error, employee) => {
    if (error) {
      next(error);
    } else if (employee) {
      req.employee = employee;
      next();
    } else {
      res.sendStatus(404);
    }
  });
});

//timesheetId param
employeesRouter.param('timesheetId', (req, res, next, timesheetId) => {
  const sql = 'SELECT * FROM Timesheet WHERE Timesheet.id = $timesheetId';
  const values = {timesheetId: timesheetId};
  db.get(sql, values, (error, timesheet) => {
    if (error) {
      next(error);
    } else if (timesheet) {
      req.timesheet = timesheet;
      next();
    } else {
      res.sendStatus(404);
    }
  });
});


//GET /employees - Returns a 200 response containing all saved currently-employed employees (is_current_employee is equal to 1) on the employees property of the response body
employeesRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM Employee WHERE Employee.is_current_employee = 1',
    (err, employees) => {
      if (err) {
        next(err);
      } else {
        res.status(200).json({employees: employees});
      }
    });
});

//POST /employees - Creates a new employee with the information from the employee property of the request body and saves it to the database.
//Returns a 201 response with the newly-created employee on the employee property of the response body
//If any required fields are missing, returns a 400 response
employeesRouter.post('/', (req, res, next) => {
  const name = req.body.employee.name,
        position = req.body.employee.position,
        wage = req.body.employee.wage,
        isCurrentEmployee = req.body.employee.isCurrentEmployee === 0 ? 0 : 1;
  if (!name || !position || !wage) {
    return res.sendStatus(400);
  }

  const sql = 'INSERT INTO Employee (name, position, wage, is_current_employee)' +
      'VALUES ($name, $position, $wage, $isCurrentEmployee)';
  const values = {
    $name: name,
    $position: position,
    $wage: wage,
    $isCurrentEmployee: isCurrentEmployee
  };

  db.run(sql, values, function(error) {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Employee WHERE Employee.id = ${this.lastID}`,
        (error, employee) => {
          res.status(201).json({employee: employee});
        });
    }
  });
});


/* --- /employees/:employeeId --- */

//GET /employees/:id - Returns a 200 response containing the employee with the supplied employee ID on the employee property of the response body
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
employeesRouter.get('/:employeeId', (req,res,next) => {
  res.status(200).json({employee: req.employee});
});

//PUT /employees/:employeeId - Updates the employee with the specified employee ID using the information from the employee property of the request body and saves it to the database. Returns a 200 response with the updated employee on the employee property of the response body
//If any required fields are missing, returns a 400 response
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
employeesRouter.put('/:employeeId', (req, res, next) => {
  const name = req.body.employee.name,
        position = req.body.employee.position,
        wage = req.body.employee.wage,
        isCurrentEmployee = req.body.employee.isCurrentEmployee === 0 ? 0 : 1;
  if (!name || !position || !wage) {
    return res.sendStatus(400);
  }

  const sql = 'UPDATE Employee SET name = $name, position = $position, ' +
      'wage = $wage, is_current_employee = $isCurrentEmployee ' +
      'WHERE Employee.id = $employeeId';
  const values = {
    $name: name,
    $position: position,
    $wage: wage,
    $isCurrentEmployee: isCurrentEmployee,
    $employeeId: req.params.employeeId
  };

  db.run(sql, values, (error) => {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Employee WHERE Employee.id = ${req.params.employeeId}`,
        (error, employee) => {
          res.status(200).json({employee: employee});
        });
    }
  });
});

//DELETE /employees/:employeeId - Updates the employee with the specified employee ID to be unemployed (is_current_employee equal to 0). Returns a 200 response.
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
employeesRouter.delete('/:employeeId', (req, res, next) => {
  const sql = 'UPDATE Employee SET is_current_employee = $num WHERE id = $EmployeeId';
  const values = {
    $num: 0,
    $employeeId: req.params.employeeId
  };

  db.run(sql, values, (error) => {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`,
        (error, employee) => {
          res.status(200).json({employee: employee});
        });
    }
  });
});


/* --- /employees/:employeeId/timesheets --- */

//GET /employees/:employeeId/timesheets - Returns a 200 response containing all saved timesheets related to the employee with the supplied employee ID on the timesheets property of the response body
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
employeesRouter.get('/:employeeId/timesheets', (req, res, next) => {
  db.all('SELECT * FROM Timesheet WHERE employee_id = $employee_id',{
    $employee_id: req.params.employeeId
  },
    (err, times) => {
      if (err) {
        next(err);
      } else {
        res.status(200).json({timesheets: times});
      }
    });
});

//POST /employees/:employeeId/timesheets - Creates a new timesheet, related to the employee with the supplied employee ID, with the information from the timesheet property of the request body and saves it to the database. Returns a 201 response with the newly-created timesheet on the timesheet property of the response body
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
employeesRouter.post('/:employeeId/timesheets', valTimesheet, (req, res, next) => {
  const hours = req.body.timesheet.hours,
        rate = req.body.timesheet.rate,
        date = req.body.timesheet.date;
        //employee_id = req.params.employeeId === 0 ? 0 : 1;


  const sql = 'INSERT INTO Timesheet (hours, rate, date, employee_id)' +
      'VALUES ($hours, $rate, $date, $employee_id)';
  const values = {
    $hours: hours,
    $rate: rate,
    $date: date,
    $employee_id: req.params.employeeId
  };

  db.run(sql, values, function(error) {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Timesheet WHERE id = ${this.lastID}`,
        (error, times) => {
          res.status(201).json({timesheet: times});
        });
    }
  });
});



/* ---- PROBLEMEEEE ---- */

/* --- /employees/:employeeId/timesheets/:timesheetId --- */

//PUT /employees/:employeeId/timesheets/:timesheetId - Updates the timesheet with the specified timesheet ID using the information from the timesheet property of the request body and saves it to the database. Returns a 200 response with the updated timesheet on the timesheet property of the response body
//If any required fields are missing, returns a 400 response
//If an employee with the supplied employee ID doesn't exist, returns a 404 response
//If an timesheet with the supplied timesheet ID doesn't exist, returns a 404 response
employeesRouter.put('/:employeeId/timesheets/:timesheetId', valTimesheet, (req, res, next) => {
  const hours = req.body.timesheet.hours,
        rate = req.body.timesheet.rate,
        date = req.body.timesheet.date;

  const sql = 'UPDATE Employee SET hours = $hours, rate = $rate, ' +
      'date = $date, employee_id = $employeeId ' +
      'WHERE id = $timesheetId';
  const values = {
    $hours: hours,
    $rate: rate,
    $date: date,
    $employeeId: req.params.employeeId,
    $timesheetId: req.params.timesheet
  };

  db.run(sql, values, (error) => {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheet}`,
        (error, timesheet) => {
          res.status(200).json({timesheets: timesheet});
        });
    }
  });
});

employeesRouter.delete('/:employeeId/timesheets/:timesheetId', (req, res, next) => {
    const query = 'DELETE FROM Timesheet WHERE Timesheet.id = $id';
    const values = {$id: req.params.timesheetId};
    db.run(query, values, (err) => {
        if (err) {
            next(err);
        } else {
            res.sendStatus(204);
        }
    });
});

module.exports = employeesRouter;
