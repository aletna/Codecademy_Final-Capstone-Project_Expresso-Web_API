const express = require('express');
const menusRouter = express.Router();

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');



const valMenus = (req, res, next) => {
  const newMenu = req.body.menu;
  if (!newMenu.title) {
    return res.sendStatus(400);
  }
  next();
}

const checkItem = (req,res,next) => {
  const values = {$menuId: req.menu.id};
  const sql = `SELECT * FROM MenuItem WHERE MenuItem.menu_id = $menuId`
  db.get(sql, (err, row) => {
    if (err) {
      next(err);
    } else if (row) {
      return res.sendStatus(400);
    } else {
      next();
    }
  });
}
menusRouter.param('menuId', (req, res, next, menuId) => {
  const sql = 'SELECT * FROM Menu WHERE Menu.id = $menuId';
  const values = {$menuId: menuId};
  db.get(sql, values, (error, row) => {
    if (error) {
      next(error);
    } else if (row) {
      req.menu = row;
      next();
    } else {
      res.sendStatus(404);
    }
  });
});

menusRouter.param('menuItemId', (req, res, next, menuItemId) => {
    const sql = 'SELECT * FROM MenuItem WHERE MenuItem.id = $id';
    const values = {$id: menuItemId};
    db.get(sql, values, (err, menuItem) => {
        if (err) {
            next(err);
        } else if (menuItem) {
            req.menuItem = menuItem;
            next();
        } else {
            res.sendStatus(404);
        }
    });
});


//GET /menus
menusRouter.get('/', (req, res, next) => {
  db.all('SELECT * FROM Menu',
    (err, row) => {
      if (err) {
        next(err);
      } else {
        res.status(200).json({menus: row});
      }
    });
});

//POST /menus
menusRouter.post('/', valMenus, (req, res, next) => {
  const title = req.body.menu.title;

  const sql = 'INSERT INTO Menu (title)' +
      'VALUES ($title)';
  const values = {$title: title};

  db.run(sql, values, function(error) {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Menu WHERE Menu.id = ${this.lastID}`,
        (error, row) => {
          res.status(201).json({menu: row});
        });
    }
  });
});


//GET /menus/:menuId
menusRouter.get('/:menuId', (req,res,next) => {
  res.status(200).json({menu: req.menu});
});

//PUT /menus/:menuId
menusRouter.put('/:menuId', valMenus, (req, res, next) => {
  const title = req.body.menu.title;
  const sql = `UPDATE Menu SET title = $title WHERE Menu.id = $menuId`
  const values = {
    $title: title,
    $menuId: req.menu.id
  };

  db.run(sql, values, (error) => {
    if (error) {
      next(error);
    } else {
      db.get(`SELECT * FROM Menu WHERE Menu.id = ${req.menu.id}`,
        (error, row) => {
          res.status(200).json({menu: row});
        });
    }
  });
});

//// PROBLEMO /////
menusRouter.delete('/:menuId', checkItem, (req, res, next) => {

  const sql = `DELETE FROM Menu WHERE Menu.id = $menuId`
  const values = {$menuId: req.menu.id};

  db.run(sql, values, (err) => {
    if (err) {
      next(err);
    } else {
      res.sendStatus(204);
    }
  });
});

//GET
menusRouter.get('/:menuId/menu-items', (req, res, next) => {
    const query = 'SELECT * FROM MenuItem WHERE MenuItem.menu_id = $menu_id';
    const values = {$menu_id: req.params.menuId};
    db.all(query, values, (err, menuItems) => {
        if (err) {
            next(err);
        } else if (!menuItems) {
            res.status(200).json({menuItems: []});
        } else {
            res.status(200).json({menuItems: menuItems});
        }
    });
});

//POST
menusRouter.post(':menuId/menu-items/', (req, res, next) => {
    const name = req.body.menuItem.name,
        description = req.body.menuItem.description,
        inventory = req.body.menuItem.inventory,
        price = req.body.menuItem.price;
    if (!name || !inventory || !price) {
        return res.sendStatus(400);
    }

    const sql = 'INSERT INTO MenuItem (name, description, inventory, price, menu_id) ' +
                'VALUES ($name, $description, $inventory, $price, $menu_id)';

    const values = {$name: name,
                    $description: description,
                    $inventory: inventory,
                    $price: price,
                    $menu_id: req.params.menuId};
    db.run(sql, values, function(err) {
        if (err) {
            next(err);
        } else {
            db.get('SELECT * FROM MenuItem WHERE MenuItem.id = $id', {$id: this.lastID}, (err, row) => {
                if (err) {
                    next(err);
                } else {
                    res.status(201).json({menuItems: row});
                }
            });
        }
    });
});

//PUT
menusRouter.put('/:menuId/menu-items/:menuItemId', (req, res, next) => {
    const name = req.body.menuItem.name,
        description = req.body.menuItem.description,
        inventory = req.body.menuItem.inventory,
        price = req.body.menuItem.price;
    if (!name || !inventory || !price) {
        return res.sendStatus(400);
    }

    const sql = 'UPDATE MenuItem SET name = $name, description = $description , inventory = $inventory, price = $price ' +
                'WHERE MenuItem.id = $id';

    const values = {$name: name,
                    $description: description,
                    $inventory: inventory,
                    $price: price,
                    $id: req.params.menuItemId};

    db.run(sql, values, (err) => {
        if (err) {
            next(err);
        } else {
            db.get('SELECT * FROM MenuItem WHERE MenuItem.id = $id', {$id: req.params.menuItemId}, (err, row) => {
                if (err) {
                    next(err);
                } else {
                    res.status(200).json({menuItem: row});
                }
            });
        }
    });
});

//DELETE
menusRouter.delete('/:menuId/menu-items/:menuItemId', (req, res, next) => {
    const sql = 'DELETE FROM MenuItem WHERE MenuItem.id = $id';
    const values = {$id: req.params.menuItemId};
    db.run(sql, values, (err) => {
        if (err) {
            next(err);
        } else {
            res.sendStatus(204);
        }
    });
});


module.exports = menusRouter;
