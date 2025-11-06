
-- ==========================================
-- 5. TRIGGERS
-- ==========================================
DELIMITER $$

-- Update totals automatically when order details change
CREATE TRIGGER UpdateOrderTotal
AFTER INSERT ON OrderDetails
FOR EACH ROW
BEGIN
    UPDATE OrderTable
    SET TotalAmount = CalculateOrderTotal(NEW.OrderID),
        TotalWeightKg = CalculateOrderWeight(NEW.OrderID)
    WHERE OrderID = NEW.OrderID;
END $$

-- Notify customer when order status changes
CREATE TRIGGER NotifyStatusChange
AFTER UPDATE ON OrderTable
FOR EACH ROW
BEGIN
    IF NEW.Status <> OLD.Status THEN
        INSERT INTO Notification(CustomerID, OrderID, Message)
        VALUES(NEW.CustomerID, NEW.OrderID, CONCAT('Order status updated to ', NEW.Status));
    END IF;
END $$



DELIMITER ;


DELIMITER $$
