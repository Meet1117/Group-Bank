const express = require("express");
const auth = require("../middleware/auth");
const {
  list,
  readAll,
  readOne,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(auth);

router.get("/", list);
router.post("/read-all", readAll);
router.post("/:id/read", readOne);

module.exports = router;
