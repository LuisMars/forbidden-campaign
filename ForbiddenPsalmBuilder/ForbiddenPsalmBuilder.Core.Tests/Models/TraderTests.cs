using ForbiddenPsalmBuilder.Core.Models.Selection;
using Xunit;

namespace ForbiddenPsalmBuilder.Core.Tests.Models;

public class TraderTests
{
    [Fact]
    public void Trader_ShouldHaveRequiredProperties()
    {
        // Arrange & Act
        var trader = new Trader
        {
            Id = "mad-wizard",
            Name = "Vriprix the Mad Wizard",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m,
            GameVariant = "end-times"
        };

        // Assert
        Assert.Equal("mad-wizard", trader.Id);
        Assert.Equal("Vriprix the Mad Wizard", trader.Name);
        Assert.Equal(0.5m, trader.BuyMultiplier);
        Assert.Equal(1.0m, trader.SellMultiplier);
        Assert.Equal("end-times", trader.GameVariant);
    }

    [Fact]
    public void Trader_CalculateBuyPrice_ShouldReturnHalfPrice()
    {
        // Arrange
        var trader = new Trader
        {
            Id = "mad-wizard",
            Name = "Vriprix",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m
        };

        // Act
        var buyPrice = trader.CalculateBuyPrice(10);

        // Assert
        Assert.Equal(5, buyPrice);
    }

    [Fact]
    public void Trader_CalculateBuyPrice_ShouldRoundDown()
    {
        // Arrange
        var trader = new Trader
        {
            Id = "mad-wizard",
            Name = "Vriprix",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m
        };

        // Act
        var buyPrice = trader.CalculateBuyPrice(7); // 7 * 0.5 = 3.5, should round down to 3

        // Assert
        Assert.Equal(3, buyPrice);
    }

    [Fact]
    public void Trader_CalculateSellPrice_ShouldReturnFullPrice()
    {
        // Arrange
        var trader = new Trader
        {
            Id = "mad-wizard",
            Name = "Vriprix",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m
        };

        // Act
        var sellPrice = trader.CalculateSellPrice(10);

        // Assert
        Assert.Equal(10, sellPrice);
    }

    [Fact]
    public void TheMerchant_CalculateBuyPrice_ShouldAddOneGold()
    {
        // Arrange - The Merchant buys for +1 Gold more than standard 50%
        var merchant = new Trader
        {
            Id = "merchant",
            Name = "The Merchant",
            BuyMultiplier = 0.5m,
            BuyModifier = 1, // +1 Gold
            SellMultiplier = 1.0m
        };

        // Act
        var buyPrice = merchant.CalculateBuyPrice(10); // (10 * 0.5) + 1 = 6

        // Assert
        Assert.Equal(6, buyPrice);
    }

    [Fact]
    public void TheMerchant_CalculateSellPrice_ShouldSubtractOneGold()
    {
        // Arrange - The Merchant sells for -1 Gold less than full price
        var merchant = new Trader
        {
            Id = "merchant",
            Name = "The Merchant",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m,
            SellModifier = -1 // -1 Gold
        };

        // Act
        var sellPrice = merchant.CalculateSellPrice(10); // (10 * 1.0) - 1 = 9

        // Assert
        Assert.Equal(9, sellPrice);
    }

    [Fact]
    public void TheMerchant_CalculateSellPrice_ShouldNotGoBelowMinimum()
    {
        // Arrange
        var merchant = new Trader
        {
            Id = "merchant",
            Name = "The Merchant",
            BuyMultiplier = 0.5m,
            SellMultiplier = 1.0m,
            SellModifier = -1,
            MinimumSellPrice = 1
        };

        // Act
        var sellPrice = merchant.CalculateSellPrice(1); // (1 * 1.0) - 1 = 0, but minimum is 1

        // Assert
        Assert.Equal(1, sellPrice);
    }

    [Fact]
    public void Trader_ShouldSupportInventoryLimits()
    {
        // Arrange
        var merchant = new Trader
        {
            Id = "merchant",
            Name = "The Merchant",
            HasLimitedInventory = true,
            MaxWeapons = 3,
            MaxArmor = 1,
            MaxEquipment = 1
        };

        // Assert
        Assert.True(merchant.HasLimitedInventory);
        Assert.Equal(3, merchant.MaxWeapons);
        Assert.Equal(1, merchant.MaxArmor);
        Assert.Equal(1, merchant.MaxEquipment);
    }

    [Fact]
    public void Trader_ShouldSupportRiskMechanic()
    {
        // Arrange
        var merchant = new Trader
        {
            Id = "merchant",
            Name = "The Merchant",
            HasRisk = true,
            RiskDieSize = 20,
            RiskFailValue = 1,
            RiskPenalty = "Lost Limb injury"
        };

        // Assert
        Assert.True(merchant.HasRisk);
        Assert.Equal(20, merchant.RiskDieSize);
        Assert.Equal(1, merchant.RiskFailValue);
        Assert.Equal("Lost Limb injury", merchant.RiskPenalty);
    }

    [Fact]
    public void Trader_ShouldSupportChapterRestrictions()
    {
        // Arrange
        var hogsHead = new Trader
        {
            Id = "hogs-head",
            Name = "Hogs Head Inn",
            MinimumChapter = 2,
            IsUpgradeShop = true
        };

        // Assert
        Assert.Equal(2, hogsHead.MinimumChapter);
        Assert.True(hogsHead.IsUpgradeShop);
    }
}
