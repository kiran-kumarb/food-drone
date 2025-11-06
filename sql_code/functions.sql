-- ==========================================
-- 3. FUNCTIONS
-- ==========================================
DELIMITER $$

CREATE FUNCTION CalculateOrderTotal(p_OrderID INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT SUM(m.Price * od.Quantity)
    INTO total
    FROM OrderDetails od
    JOIN MenuItem m ON od.ItemID = m.ItemID
    WHERE od.OrderID = p_OrderID;
    RETURN IFNULL(total, 0);
END $$

CREATE FUNCTION CalculateOrderWeight(p_OrderID INT)
RETURNS DECIMAL(8,3)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(8,3);
    SELECT SUM(m.WeightKg * od.Quantity)
    INTO total
    FROM OrderDetails od
    JOIN MenuItem m ON od.ItemID = m.ItemID
    WHERE od.OrderID = p_OrderID;
    RETURN IFNULL(total, 0);
END $$

DELIMITER ;
