-- =======================================================
-- STORED PROCEDURES FOR FOOD DELIVERY SYSTEM
-- =======================================================

DELIMITER $$

-- =======================================================
-- 1. PLACE ORDER PROCEDURE
-- =======================================================
CREATE PROCEDURE PlaceOrder(
    IN p_CustomerID INT,
    IN p_RestaurantID INT,
    IN p_LocationID INT
)
BEGIN
    -- Insert a new order
    INSERT INTO OrderTable (CustomerID, RestaurantID, LocationID, OrderDate)
    VALUES (p_CustomerID, p_RestaurantID, p_LocationID, NOW());

    -- Initialize payment record with 0 amount and pending status
    INSERT INTO Payment (OrderID, Amount, Method, Status)
    VALUES (LAST_INSERT_ID(), 0, 'UPI', 'Pending');
END $$


-- =======================================================
-- 2. ADD ORDER ITEM PROCEDURE
-- =======================================================
CREATE PROCEDURE AddOrderItem(
    IN p_OrderID INT,
    IN p_ItemID INT,
    IN p_Quantity INT
)
BEGIN
    -- Add item to order details
    INSERT INTO OrderDetails (OrderID, ItemID, Quantity)
    VALUES (p_OrderID, p_ItemID, p_Quantity);
END $$


-- =======================================================
-- 3. MAKE PAYMENT PROCEDURE
-- =======================================================
CREATE PROCEDURE MakePayment(
    IN p_OrderID INT,
    IN p_Method VARCHAR(20)
)
BEGIN
    DECLARE total DECIMAL(10,2);

    -- Calculate total order amount
    SELECT CalculateOrderTotal(p_OrderID) INTO total;

    -- Update payment details
    UPDATE Payment
    SET Amount = total, Method = p_Method, Status = 'Completed'
    WHERE OrderID = p_OrderID;

    -- Update order status
    UPDATE OrderTable
    SET TotalAmount = total, Status = 'Paid'
    WHERE OrderID = p_OrderID;

    -- Optional: Assign a drone after payment
    -- CALL AssignDrone(p_OrderID);
END $$


-- =======================================================
-- 4. ASSIGN DRONE PROCEDURE
-- =======================================================
CREATE PROCEDURE AssignDrone(IN p_OrderID INT)
BEGIN
    DECLARE droneID INT;

    -- Select first available drone
    SELECT DroneID INTO droneID
    FROM Drone
    WHERE Status = 'Available'
    LIMIT 1;

    IF droneID IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available drones';
    ELSE
        -- Assign drone to delivery
        INSERT INTO Delivery (OrderID, DroneID, StartTime, Status)
        VALUES (p_OrderID, droneID, NOW(), 'InTransit');

        -- Update drone and order statuses
        UPDATE Drone
        SET Status = 'Busy'
        WHERE DroneID = droneID;

        UPDATE OrderTable
        SET Status = 'InTransit'
        WHERE OrderID = p_OrderID;
    END IF;
END $$


-- =======================================================
-- 5. COMPLETE DELIVERY PROCEDURE
-- =======================================================
CREATE PROCEDURE CompleteDelivery(IN p_OrderID INT)
BEGIN
    -- Mark delivery as completed
    UPDATE Delivery
    SET Status = 'Delivered', EndTime = NOW()
    WHERE OrderID = p_OrderID;

    -- Make drone available again
    UPDATE Drone 
    SET Status = 'Available'
    WHERE DroneID = (SELECT DroneID FROM Delivery WHERE OrderID = p_OrderID);

    -- Update order status
    UPDATE OrderTable
    SET Status = 'Delivered'
    WHERE OrderID = p_OrderID;
END $$


-- =======================================================
-- 6. REGISTER CUSTOMER PROCEDURE
-- =======================================================
CREATE PROCEDURE RegisterCustomer(
    IN p_Name VARCHAR(100),
    IN p_Phone VARCHAR(15),
    IN p_Email VARCHAR(100),
    IN p_Address VARCHAR(255),
    IN p_Username VARCHAR(50),
    IN p_Password VARCHAR(255)
)
BEGIN
    DECLARE existing INT;

    -- Check for duplicate username
    SELECT COUNT(*) INTO existing
    FROM Customer
    WHERE Username = p_Username;

    IF existing > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Username already exists. Please choose another.';
    ELSE
        INSERT INTO Customer (Name, Phone, Email, Address, Username, Password)
        VALUES (p_Name, p_Phone, p_Email, p_Address, p_Username, p_Password);
    END IF;
END $$


-- =======================================================
-- 7. LOGIN CUSTOMER PROCEDURE
-- =======================================================
CREATE PROCEDURE LoginCustomer(
    IN p_Username VARCHAR(50),
    IN p_Password VARCHAR(255)
)
BEGIN
    DECLARE userCount INT;

    -- Verify username and password
    SELECT COUNT(*) INTO userCount
    FROM Customer
    WHERE Username = p_Username AND Password = p_Password;

    IF userCount = 1 THEN
        SELECT 'Login successful' AS Message, CustomerID, Name, Email
        FROM Customer
        WHERE Username = p_Username;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid username or password.';
    END IF;
END $$

-- TO BE IMPLEMENTED LATER ::::::::::::::::::::::::::::::::::::::::::::::
-- =======================================================
-- 8. REGISTER RESTAURANT PROCEDURE
-- =======================================================
CREATE PROCEDURE RegisterRestaurant(
    IN p_Name VARCHAR(100),
    IN p_Location VARCHAR(255),
    IN p_Contact VARCHAR(20)
)
BEGIN
    DECLARE existing INT;

    -- Check if restaurant already exists at same location
    SELECT COUNT(*) INTO existing
    FROM Restaurant
    WHERE Name = p_Name AND Location = p_Location;

    IF existing > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Restaurant already exists at this location.';
    ELSE
        INSERT INTO Restaurant (Name, Location, Contact)
        VALUES (p_Name, p_Location, p_Contact);
    END IF;
END $$


-- =======================================================
-- 9. ADD MENU ITEM PROCEDURE
-- =======================================================
CREATE PROCEDURE AddMenuItem(
    IN p_RestaurantID INT,
    IN p_Name VARCHAR(100),
    IN p_Description VARCHAR(255),
    IN p_Price DECIMAL(10,2),
    IN p_WeightKg DECIMAL(6,3)
)
BEGIN
    -- Add new item to restaurant menu
    INSERT INTO MenuItem (RestaurantID, Name, Description, Price, WeightKg)
    VALUES (p_RestaurantID, p_Name, p_Description, p_Price, p_WeightKg);
END $$


-- =======================================================
-- 10. UPDATE MENU ITEM PROCEDURE
-- =======================================================
CREATE PROCEDURE UpdateMenuItem(
    IN p_ItemID INT,
    IN p_NewPrice DECIMAL(10,2),
    IN p_NewDescription VARCHAR(255)
)
BEGIN
    -- Update price and description of menu item
    UPDATE MenuItem
    SET Price = p_NewPrice,
        Description = p_NewDescription
    WHERE ItemID = p_ItemID;
END $$


-- =======================================================
-- 11. DELETE MENU ITEM PROCEDURE
-- =======================================================
CREATE PROCEDURE DeleteMenuItem(IN p_ItemID INT)
BEGIN
    -- Remove menu item from table
    DELETE FROM MenuItem
    WHERE ItemID = p_ItemID;
END $$

DELIMITER ;



--admin--
DELIMITER $$

CREATE PROCEDURE AdminLogin(
    IN p_Username VARCHAR(50),
    IN p_Password VARCHAR(255)
)
BEGIN
    DECLARE adminCount INT;

    SELECT COUNT(*) INTO adminCount
    FROM Admin
    WHERE Username = p_Username AND Password = p_Password;

    IF adminCount = 1 THEN
        SELECT 
            'Login successful' AS Message,
            AdminID,
            Username,
            Name
        FROM Admin
        WHERE Username = p_Username;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid admin credentials.';
    END IF;
END $$

DELIMITER ;

ALTER TABLE MenuItem 
ADD COLUMN Status VARCHAR(20) DEFAULT 'Active';
DELIMITER $$

CREATE PROCEDURE DeleteMenuItemSoft(IN p_ItemID INT)
BEGIN
    UPDATE MenuItem
    SET Status = 'Removed'
    WHERE ItemID = p_ItemID;
END $$

DELIMITER ;