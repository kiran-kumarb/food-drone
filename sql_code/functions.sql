-- =======================================================
-- 3. FUNCTIONS
-- =======================================================

DELIMITER $$

-- =======================================================
-- FUNCTION: CalculateOrderTotal
-- PURPOSE : Calculates the total price for a given order
-- PARAMETERS:
--   p_OrderID - The ID of the order whose total is to be calculated
-- RETURNS   : Total amount (DECIMAL(10,2))
-- =======================================================
CREATE FUNCTION CalculateOrderTotal(p_OrderID INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(10,2);

    -- Sum of (price × quantity) for all items in the order
    SELECT SUM(m.Price * od.Quantity)
    INTO total
    FROM OrderDetails od
    JOIN MenuItem m ON od.ItemID = m.ItemID
    WHERE od.OrderID = p_OrderID;

    -- Return total or 0 if null
    RETURN IFNULL(total, 0);
END $$


-- =======================================================
-- FUNCTION: CalculateOrderWeight
-- PURPOSE : Calculates the total weight of items in an order
-- PARAMETERS:
--   p_OrderID - The ID of the order whose total weight is to be calculated
-- RETURNS   : Total weight in kilograms (DECIMAL(8,3))
-- =======================================================
CREATE FUNCTION CalculateOrderWeight(p_OrderID INT)
RETURNS DECIMAL(8,3)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(8,3);

    -- Sum of (weight × quantity) for all items in the order
    SELECT SUM(m.WeightKg * od.Quantity)
    INTO total
    FROM OrderDetails od
    JOIN MenuItem m ON od.ItemID = m.ItemID
    WHERE od.OrderID = p_OrderID;

    -- Return total or 0 if null
    RETURN IFNULL(total, 0);
END $$

DELIMITER ;
