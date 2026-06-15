const express = require("express");

const auth = require("../middleware/auth");
const {
  list,
  createDeposit,
  createExpense,
  balances,
  deleteTransaction,
} = require("../controllers/transactionController");

// mergeParams so :roomId from the parent mount (/api/rooms/:roomId/transactions)
// is available to this router and its controllers.
const router = express.Router({ mergeParams: true });

// All transaction routes require an authenticated user.
router.use(auth);

router.get("/", list);
router.post("/deposits", createDeposit);
router.post("/expenses", createExpense);
router.get("/balances", balances);
router.delete("/:txId", deleteTransaction);

module.exports = router;
