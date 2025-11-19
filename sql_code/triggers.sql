-- =======================================================
-- 5. TRIGGERS
-- =======================================================

DELIMITER $$

-- =======================================================
-- TRIGGER: UpdateOrderTotal
-- PURPOSE : Automatically update order totals (amount & weight)
--            whenever a new item is added to the order.
-- TABLE   : OrderDetails
-- EVENT   : AFTER INSERT
-- =======================================================
CREATE TRIGGER UpdateOrderTotal
AFTER INSERT ON OrderDetails
FOR EACH ROW
BEGIN
    -- Recalculate total amount and total weight for the order
    UPDATE OrderTable
    SET TotalAmount = CalculateOrderTotal(NEW.OrderID),
        TotalWeightKg = CalculateOrderWeight(NEW.OrderID)
    WHERE OrderID = NEW.OrderID;
END $$


-- =======================================================
-- TRIGGER: NotifyStatusChange
-- PURPOSE : Automatically notify customers when order status changes.
-- TABLE   : OrderTable
-- EVENT   : AFTER UPDATE
-- =======================================================
CREATE TRIGGER NotifyStatusChange
AFTER UPDATE ON OrderTable
FOR EACH ROW
BEGIN
    -- If order status has changed, insert a notification record
    IF NEW.Status <> OLD.Status THEN
        INSERT INTO Notification (CustomerID, OrderID, Message)
        VALUES (
            NEW.CustomerID,
            NEW.OrderID,
            CONCAT('Order status updated to ', NEW.Status)
        );
    END IF;
END $$

DELIMITER ;
