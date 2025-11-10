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
ALTER TABLE Restaurant
ADD COLUMN ImageURL VARCHAR(255) DEFAULT NULL,
ADD COLUMN Cuisine VARCHAR(100) DEFAULT NULL,
ADD COLUMN Rating DECIMAL(2,1) DEFAULT 4.5,
ADD COLUMN EstimatedTime VARCHAR(20) DEFAULT '25-35 mins',
ADD COLUMN IsOpen BOOLEAN DEFAULT TRUE;






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
