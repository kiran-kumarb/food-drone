-- ==========================================
-- 1. CREATE DATABASE AND USE IT
-- ==========================================
CREATE DATABASE IF NOT EXISTS FoodDroneDB;
USE FoodDroneDB;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

CREATE TABLE Customer (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100),
    Phone VARCHAR(15),
    Email VARCHAR(100),
    Address VARCHAR(255)
);
ALTER TABLE Customer
ADD COLUMN Username VARCHAR(50) UNIQUE,
ADD COLUMN Password VARCHAR(255);

CREATE TABLE Restaurant (
    RestaurantID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100),
    Location VARCHAR(255),
    Contact VARCHAR(20)
);

CREATE TABLE MenuItem (
    ItemID INT AUTO_INCREMENT PRIMARY KEY,
    RestaurantID INT,
    Name VARCHAR(100),
    Description VARCHAR(255),
    Price DECIMAL(10,2),
    WeightKg DECIMAL(6,3) DEFAULT 0.250,
    FOREIGN KEY (RestaurantID) REFERENCES Restaurant(RestaurantID)
);

CREATE TABLE DeliveryLocation (
    LocationID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT,
    Latitude DECIMAL(9,6),
    Longitude DECIMAL(9,6),
    BuildingName VARCHAR(100),
    FloorNumber INT,
    BuildingHeightM INT,
    Landmark VARCHAR(255),
    Status VARCHAR(20) DEFAULT 'Available',
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID)
);

CREATE TABLE OrderTable (
    OrderID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT,
    RestaurantID INT,
    LocationID INT,
    OrderDate DATETIME,
    TotalAmount DECIMAL(10,2) DEFAULT 0,
    TotalWeightKg DECIMAL(8,3) DEFAULT 0,
    Status VARCHAR(20) DEFAULT 'Placed',
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID),
    FOREIGN KEY (RestaurantID) REFERENCES Restaurant(RestaurantID),
    FOREIGN KEY (LocationID) REFERENCES DeliveryLocation(LocationID)
);

CREATE TABLE OrderDetails (
    OrderID INT,
    ItemID INT,
    Quantity INT,
    PRIMARY KEY (OrderID, ItemID),
    FOREIGN KEY (OrderID) REFERENCES OrderTable(OrderID),
    FOREIGN KEY (ItemID) REFERENCES MenuItem(ItemID)
);

CREATE TABLE Drone (
    DroneID INT AUTO_INCREMENT PRIMARY KEY,
    Model VARCHAR(50),
    Capacity DECIMAL(6,3),
    MaxHeight INT,
    RangeKm DECIMAL(6,2),
    Status VARCHAR(20) DEFAULT 'Available'
);

CREATE TABLE Delivery (
    DeliveryID INT AUTO_INCREMENT PRIMARY KEY,
    OrderID INT,
    DroneID INT,
    StartTime DATETIME,
    EndTime DATETIME,
    Status VARCHAR(20) DEFAULT 'Pending',
    FOREIGN KEY (OrderID) REFERENCES OrderTable(OrderID),
    FOREIGN KEY (DroneID) REFERENCES Drone(DroneID)
);

CREATE TABLE Payment (
    PaymentID INT AUTO_INCREMENT PRIMARY KEY,
    OrderID INT,
    Amount DECIMAL(10,2),
    Method VARCHAR(20),
    Status VARCHAR(20) DEFAULT 'Pending',
    FOREIGN KEY (OrderID) REFERENCES OrderTable(OrderID)
);

CREATE TABLE Notification (
    NotificationID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT,
    OrderID INT,
    Message VARCHAR(255),
    CreatedAt DATETIME DEFAULT NOW(),
    IsRead TINYINT DEFAULT 0
);

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

-- ==========================================
-- 4. PROCEDURES
-- ==========================================
DELIMITER $$

CREATE PROCEDURE PlaceOrder(
    IN p_CustomerID INT,
    IN p_RestaurantID INT,
    IN p_LocationID INT
)
BEGIN
    INSERT INTO OrderTable(CustomerID, RestaurantID, LocationID, OrderDate)
    VALUES(p_CustomerID, p_RestaurantID, p_LocationID, NOW());
    
    INSERT INTO Payment(OrderID, Amount, Method, Status)
    VALUES(LAST_INSERT_ID(), 0, 'UPI', 'Pending');
END $$

CREATE PROCEDURE AddOrderItem(
    IN p_OrderID INT,
    IN p_ItemID INT,
    IN p_Quantity INT
)
BEGIN
    INSERT INTO OrderDetails(OrderID, ItemID, Quantity)
    VALUES(p_OrderID, p_ItemID, p_Quantity);
END $$

CREATE PROCEDURE MakePayment(
    IN p_OrderID INT,
    IN p_Method VARCHAR(20)
)
BEGIN
    DECLARE total DECIMAL(10,2);
    SELECT CalculateOrderTotal(p_OrderID) INTO total;
    
    UPDATE Payment
    SET Amount = total, Method = p_Method, Status = 'Completed'
    WHERE OrderID = p_OrderID;
    
    UPDATE OrderTable
    SET TotalAmount = total, Status = 'Paid'
    WHERE OrderID = p_OrderID;
END $$


DELIMITER $$

DROP PROCEDURE IF EXISTS AssignDrone $$

CREATE PROCEDURE AssignDrone(IN p_OrderID INT)
BEGIN
    DECLARE droneID INT;

    -- Just pick the first drone marked Available
    SELECT DroneID
      INTO droneID
      FROM Drone
     WHERE Status = 'Available'
     LIMIT 1;

    IF droneID IS NULL THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'No available drones';
    ELSE
        INSERT INTO Delivery(OrderID, DroneID, StartTime, Status)
        VALUES(p_OrderID, droneID, NOW(), 'InTransit');

        UPDATE Drone
           SET Status = 'Busy'
         WHERE DroneID = droneID;

        UPDATE OrderTable
           SET Status = 'InTransit'
         WHERE OrderID = p_OrderID;
    END IF;
END $$

DELIMITER ;


CREATE PROCEDURE CompleteDelivery(IN p_OrderID INT)
BEGIN
    UPDATE Delivery SET Status = 'Delivered', EndTime = NOW() WHERE OrderID = p_OrderID;
    UPDATE Drone 
        SET Status = 'Available' 
    WHERE DroneID = (SELECT DroneID FROM Delivery WHERE OrderID = p_OrderID);
    UPDATE OrderTable SET Status = 'Delivered' WHERE OrderID = p_OrderID;
END $$

DELIMITER ;

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

    -- Check if username already exists
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

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE LoginCustomer(
    IN p_Username VARCHAR(50),
    IN p_Password VARCHAR(255)
)
BEGIN
    DECLARE userCount INT;

    SELECT COUNT(*) INTO userCount
    FROM Customer
    WHERE Username = p_Username AND Password = p_Password;

    IF userCount = 1 THEN
        SELECT 'Login successful' AS Message,
               CustomerID, Name, Email
        FROM Customer
        WHERE Username = p_Username;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid username or password.';
    END IF;
END $$

DELIMITER ;




-- Customer 1
INSERT INTO Customer (Name, Phone, Email, Address, Username, Password)
VALUES ('Kiran Kumar', '9876543210', 'kiran@example.com', 'Bangalore', 'kiran123', 'pass123');

-- Customer 2
INSERT INTO Customer (Name, Phone, Email, Address, Username, Password)
VALUES ('Ravi Sharma', '9998887770', 'ravi@example.com', 'HSR Layout, Bangalore', 'ravi123', 'pass123');




INSERT INTO Restaurant (Name, Location, Contact)
VALUES
('SpiceHub', 'Koramangala', '080-123456'),
('GreenBowl', 'HSR Layout', '080-987654');



-- Menu for SpiceHub
INSERT INTO MenuItem (RestaurantID, Name, Description, Price, WeightKg)
VALUES
(1, 'Paneer Biryani', 'Delicious paneer biryani', 200, 0.75),
(1, 'Veg Burger', 'Crispy veg patty burger', 150, 0.30),
(1, 'Masala Dosa', 'Classic South Indian dosa', 100, 0.25);

-- Menu for GreenBowl
INSERT INTO MenuItem (RestaurantID, Name, Description, Price, WeightKg)
VALUES
(2, 'Caesar Salad', 'Fresh salad with dressing', 180, 0.40),
(2, 'Veg Sandwich', 'Toasted sandwich with veggies', 120, 0.35);





-- For Kiran
INSERT INTO DeliveryLocation (CustomerID, Latitude, Longitude, BuildingName, FloorNumber, BuildingHeightM, Landmark)
VALUES
(1, 12.9350, 77.6140, 'Golden Heights', 3, 40, 'Near Sony Signal'),
(1, 12.9300, 77.6200, 'TechPark', 2, 35, 'Opp. Metro Station');

-- For Ravi
INSERT INTO DeliveryLocation (CustomerID, Latitude, Longitude, BuildingName, FloorNumber, BuildingHeightM, Landmark)
VALUES
(2, 12.9100, 77.6300, 'SkyView Apartments', 5, 50, 'Behind Forum Mall');


INSERT INTO Drone (Model, Capacity, MaxHeight, RangeKm, Status)
VALUES
('DJI-M3', 2.5, 100, 10, 'Available'),
('SkyDrop-X1', 3.0, 120, 15, 'Available'),
('AirBee-Z2', 1.5, 80, 6, 'Available');






-- ==========================================
-- ✅ SCRIPT READY
-- ==========================================
-- Example usage:
-- CALL PlaceOrder(1, 1, 1);
-- CALL AddOrderItem(1, 1, 2);
-- CALL MakePayment(1, 'UPI');
-- CALL AssignDrone(1);
-- CALL CompleteDelivery(1);
show tables;
desc customer;
desc delivery;
desc deliverylocation;
desc drone;
desc menuitem;
desc notification;
desc orderdetails;
desc ordertable;
desc payment;
desc restaurant;

SELECT * FROM Customer;
SELECT * FROM Restaurant;
SELECT * FROM MenuItem;
SELECT * FROM Drone;
SELECT * FROM DeliveryLocation;


DELIMITER $$

CREATE PROCEDURE AssignDrone(IN p_OrderID INT)
BEGIN
    DECLARE vDroneID INT DEFAULT NULL;

    -- Make sure there are available drones
    SELECT DroneID
    INTO vDroneID
    FROM Drone
    WHERE TRIM(BOTH ' ' FROM Status) = 'Available'
    ORDER BY DroneID
    LIMIT 1;

    -- If no drone found, raise message
    IF vDroneID IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No available drones found!';
    ELSE
        -- Create a delivery entry
        INSERT INTO Delivery(OrderID, DroneID, StartTime, Status)
        VALUES(p_OrderID, vDroneID, NOW(), 'InTransit');

        -- Mark drone as busy
        UPDATE Drone
        SET Status = 'Busy'
        WHERE DroneID = vDroneID;

        -- Mark order as InTransit
        UPDATE OrderTable
        SET Status = 'InTransit'
        WHERE OrderID = p_OrderID;

        -- Optional confirmation output
        SELECT CONCAT('Drone ID ', vDroneID, ' assigned successfully!') AS Message;
    END IF;
END $$

DELIMITER ;



-- testing-----------------------------------------------------------------
CALL RegisterCustomer(
    'Ananya Rao',
    '8887776665',
    'ananya@example.com',
    'Indiranagar, Bangalore',
    'ananya01',
    'password01'
);

CALL LoginCustomer('ananya01', 'password01');

CALL PlaceOrder(3, 1, 1);

SELECT * FROM OrderTable;
SELECT * FROM Payment;

CALL AddOrderItem(1, 1, 2);
CALL AddOrderItem(1, 2, 1);

SELECT * FROM OrderDetails;
SELECT TotalAmount, TotalWeightKg, Status FROM OrderTable WHERE OrderID = 1;

CALL MakePayment(1, 'UPI');

SELECT * FROM Payment;
SELECT Status FROM OrderTable WHERE OrderID = 1;
SELECT * FROM Notification;



CALL AssignDrone(1);
SELECT DroneID, Model, Status FROM Drone;
SHOW CREATE PROCEDURE AssignDrone;



SELECT DroneID, Model, Status FROM Drone;
UPDATE Drone SET Status='Available';

UPDATE Drone SET Status = 'Available' WHERE DroneID IN (1, 2, 3);
UPDATE Drone SET Status = TRIM(BOTH ' ' FROM Status);
UPDATE Drone SET Status = 'Available' WHERE LOWER(Status) = 'available';

DROP PROCEDURE IF EXISTS AssignDrone;
SHOW PROCEDURE STATUS WHERE Name='AssignDrone';

SELECT * FROM Drone;
SELECT * FROM OrderTable;
SET SQL_SAFE_UPDATES = 0;
UPDATE Drone
SET Status = REPLACE(REPLACE(TRIM(Status), CHAR(13), ''), CHAR(10), '');
SET SQL_SAFE_UPDATES = 1;



SELECT * FROM Delivery;
SELECT * FROM Drone;
SELECT * FROM OrderTable;



CALL CompleteDelivery(1);


-- -----------------------------------------------------------------------------------------------
-- RESTAURANT 
DELIMITER $$

CREATE PROCEDURE RegisterRestaurant(
    IN p_Name VARCHAR(100),
    IN p_Location VARCHAR(255),
    IN p_Contact VARCHAR(20)
)
BEGIN
    DECLARE existing INT;

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

DELIMITER ;


CALL RegisterRestaurant('TastyTreats', 'MG Road', '080-223344');

SELECT * FROM Restaurant;

DELIMITER $$

CREATE PROCEDURE AddMenuItem(
    IN p_RestaurantID INT,
    IN p_Name VARCHAR(100),
    IN p_Description VARCHAR(255),
    IN p_Price DECIMAL(10,2),
    IN p_WeightKg DECIMAL(6,3)
)
BEGIN
    INSERT INTO MenuItem (RestaurantID, Name, Description, Price, WeightKg)
    VALUES (p_RestaurantID, p_Name, p_Description, p_Price, p_WeightKg);
END $$

DELIMITER ;
CALL AddMenuItem(3, 'Chocolate Cake', 'Rich dessert slice', 250, 0.45);
SELECT * FROM MenuItem WHERE RestaurantID = 3;


DELIMITER $$

CREATE PROCEDURE UpdateMenuItem(
    IN p_ItemID INT,
    IN p_NewPrice DECIMAL(10,2),
    IN p_NewDescription VARCHAR(255)
)
BEGIN
    UPDATE MenuItem
    SET Price = p_NewPrice,
        Description = p_NewDescription
    WHERE ItemID = p_ItemID;
END $$

DELIMITER ;

CALL UpdateMenuItem(1, 220, 'Updated Paneer Biryani with extra masala');
SELECT * FROM MenuItem WHERE ItemID = 1;

DELIMITER $$

CREATE PROCEDURE DeleteMenuItem(IN p_ItemID INT)
BEGIN
    DELETE FROM MenuItem WHERE ItemID = p_ItemID;
END $$

DELIMITER ;

CALL DeleteMenuItem(5);
SELECT * FROM MenuItem;


-- -----------------------------------------------------------
SET GLOBAL event_scheduler = ON;
DROP EVENT IF EXISTS auto_complete_deliveries;

CREATE EVENT auto_complete_deliveries
ON SCHEDULE EVERY 1 MINUTE
DO
  UPDATE Delivery D
  JOIN OrderTable O ON D.OrderID = O.OrderID
  JOIN Drone DR ON D.DroneID = DR.DroneID
  SET 
      D.Status = 'Delivered',
      D.EndTime = NOW(),
      O.Status = 'Delivered',
      DR.Status = 'Available'
  WHERE 
      D.Status = 'InTransit'
      AND D.EndTime IS NULL
      AND TIMESTAMPDIFF(MINUTE, D.StartTime, NOW()) >= 2;

SHOW PROCEDURE STATUS LIKE 'AssignDrone';

SELECT * FROM Delivery;
SET GLOBAL event_scheduler = ON;
SHOW EVENTS;
SET GLOBAL event_scheduler = ON;
UPDATE Drone SET Status = 'Available';
SHOW EVENTS;
-- --------------------------------------------------------------
show tables;
select * from customer;
select * from delivery;
select * from deliverylocation;
select * from drone;
select * from menuitem;
select * from notification;
select * from orderdetails;
select * from ordertable;
select * from payment;
select * from restaurant;

UPDATE Drone SET Status = 'Busy' WHERE DroneID = vDroneID;

