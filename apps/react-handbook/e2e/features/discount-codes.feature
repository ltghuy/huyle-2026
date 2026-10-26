@cart
Feature: Discount codes
  A shopper can enter one discount code at checkout. A code that applies lowers
  the total; a code that doesn't says why, and the total stays the same.

  Background:
    Given the shop is open with an empty cart

  Rule: A code that applies lowers the total

    Scenario Outline: <code> gives <saving>
      Given my cart has <quantity> "<product>"
      When I apply the code "<code>"
      Then the total is "<total>"

      Examples:
        | code     | saving                  | quantity | product       | total  |
        | SAVE10   | 10% off                 | 2        | Blue notebook | $20.30 |
        | BULK15   | 15% off 5 or more items | 5        | Blue notebook | $41.12 |
        | FREESHIP | free shipping           | 2        | Blue notebook | $17.00 |

  Rule: A code that doesn't apply says why

    @smoke
    Scenario: An unknown code is turned down
      Given my cart has 2 "Blue notebook"
      When I apply the code "HELLO"
      Then I am told "“HELLO” isn't a valid code."
      And the total is "$22.00"

    Scenario: The bulk code needs enough items
      Given my cart has 2 "Blue notebook"
      When I apply the code "BULK15"
      Then I am told "BULK15 needs at least 5 items."
