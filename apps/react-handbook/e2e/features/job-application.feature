@application
Feature: Applying for a job
  An applicant fills in the application one step at a time. A step can't be
  left until its answers are valid, and going back never loses an answer.

  Background:
    Given I am on the first step of the application

  Scenario: Every missing answer is pointed out
    When I continue without answering
    Then "Full name" is marked as needing an answer
    And I am still on the "Personal details" step

  Scenario Outline: The email has to be usable
    Given I have filled in my personal details with the email "<email>"
    When I continue
    Then the email is turned down with "<problem>"
    And I am still on the "Personal details" step

    Examples:
      | email             | problem                                       |
      | ada               | Enter an email address like name@example.com  |
      | taken@example.com | An application with this email already exists |

  @smoke
  Scenario: Going back keeps my answers
    Given I have filled in my personal details
    When I continue
    And I go back
    Then my personal details are still filled in
