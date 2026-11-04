import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

/** Renders a list of terms content items. */
const InfoList = ({ items }) => (
  <ul>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

/** Renders one labeled terms section. */
const TermsSection = ({ title, children, as = 'p' }) => (
  <Card.Text as={as}>
    <strong>{title}:</strong> {children}
  </Card.Text>
);

/** Renders account information and its detail list. */
const AccountSection = () => (
  <TermsSection title='Account Information' as='div'>
    We collect and store the information needed to create and manage your
    account, including your email address, username, password hash, account
    status, profile changes, login sessions, and account activity dates. Your
    password is stored as a secure hash rather than in plain text.
    <InfoList
      items={[
        'Email: used for authentication and account administration.',
        'Username: used to identify your account within the application.',
      ]}
    />
  </TermsSection>
);

/** Renders application data categories. */
const ApplicationSection = () => (
  <TermsSection title='Application Data' as='div'>
    Depending on the features you use, Mainframe may store:
    <InfoList
      items={[
        'Expense amounts, currencies, dates, descriptions, groups, and debts.',
        'Financial account and transaction details, credit schedules, investments, deposits, bonds, and pension information.',
        'Meal plans, ingredients, nutrition values, and related dates.',
        'Device names, network addresses, presence settings, and smart-device configuration.',
        'Bots, Telegram chat and message information, saved messages, commands, scheduled tasks, watchers, and automation settings.',
        'Earthquake, transit, event, source, and monitoring information used by the application.',
      ]}
    />
  </TermsSection>
);

/** Renders the Mainframe terms and conditions card body. */
const TermsCard = () => (
  <Card>
    <Card.Header as='h5'>Terms and Conditions</Card.Header>
    <Card.Body>
      <Card.Text>
        By creating an account or using Mainframe, you agree to these terms and
        conditions.
      </Card.Text>
      <AccountSection />
      <ApplicationSection />
      <Card.Text>
        <strong>User-Provided Content:</strong> Financial, expense, and related
        personal records are not automatically collected from you. They are
        stored only when you manually add or submit them through the
        application. Telegram messages are stored only when you configure a
        Telegram bot integration and explicitly ask the bot to save a message in
        Mainframe. You control whether these features are used and which content
        is submitted.
      </Card.Text>
      <Card.Text>
        <strong>How Data Is Used:</strong> Data is used to provide and maintain
        Mainframe features, authenticate users, process requests, send
        notifications, run automations, generate reports, and diagnose service
        or security issues. We do not sell your personal data.
      </Card.Text>
      <Card.Text>
        <strong>Third-Party Services:</strong> Features may transmit relevant
        data to service providers needed to operate the application, such as
        Telegram for bot notifications and messaging, Google services for
        supported storage and AI features, and error-monitoring infrastructure.
        Their use is governed by their own terms and privacy policies. Use of
        these integrations is limited to operating the corresponding Mainframe
        feature.
      </Card.Text>
      <Card.Text>
        <strong>Cookies and Browser Storage:</strong> Mainframe uses essential
        browser cookies to keep you signed in and remember your account or
        interface session. These cookies can include authentication and
        user-profile values. Operational integration settings may also use
        browser cookies for the relevant signed-in session. Mainframe does not
        use this disclosure mechanism to place advertising or marketing cookies.
      </Card.Text>
      <Card.Text>
        <strong>Data Security and Retention:</strong> We use reasonable
        technical and organizational measures to protect stored data, but no
        system can be guaranteed completely secure. Data may be retained while
        your account remains active, while it is needed to operate the service,
        or where required for administration, security, backups, or legal
        obligations.
      </Card.Text>
      <Card.Text>
        <strong>Account Access and Deletion:</strong> You are responsible for
        keeping your password and account session confidential. You may update
        permitted profile information and change your password. To request
        access to, correction of, or deletion of your account data, contact the
        Mainframe operator or an administrator. Some data may remain in backups
        or logs for a limited period, and deletion may be limited by technical
        dependencies or legal requirements.
      </Card.Text>
      <Card.Text>
        <strong>Acceptable Use:</strong> You may not use Mainframe to disrupt
        the service, gain unauthorized access, bypass permissions, submit
        malicious automation, or violate another person&apos;s rights or
        applicable law. We may suspend or restrict an account that threatens the
        service or other users.
      </Card.Text>
      <Card.Text>
        <strong>Service Availability:</strong> Mainframe may change, suspend, or
        discontinue features without guaranteeing uninterrupted availability.
        Automation, external integrations, exchange-rate information,
        monitoring, and financial calculations are provided for the
        application&apos;s purposes and are not a substitute for professional
        financial, medical, legal, or emergency advice.
      </Card.Text>
      <Card.Text>
        <strong>Changes to These Terms:</strong> We may update these terms as
        the application or applicable requirements change. Continued use after
        an update means you accept the revised terms where permitted by law.
      </Card.Text>
      <Card.Text>
        <strong>Agreement:</strong> By registering, signing in, or using
        Mainframe, you acknowledge that you have read and understood these terms
        and agree to them.
      </Card.Text>
    </Card.Body>
  </Card>
);

/** Renders the public terms and conditions page. */
const TermsAndConditions = () => (
  <Container>
    <Row>
      <Col>
        <TermsCard />
      </Col>
    </Row>
  </Container>
);

export default TermsAndConditions;
