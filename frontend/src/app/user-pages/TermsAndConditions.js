import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const TermsAndConditions = () => <Container>
  <Row>
    <Col>
      <Card>
        <Card.Header as="h5">Terms and Conditions</Card.Header>
        <Card.Body>
          <Card.Text>
            By registering to our website, you agree to the following terms and conditions:
          </Card.Text>
          <Card.Text>
            <strong>Data Collection:</strong> We only collect and store the following information about you:
            <ul>
              <li>Email: We collect your email address for communication purposes.</li>
              <li>Expenses: We collect and store information about your expenses for analysis and tracking purposes.</li>
            </ul>
          </Card.Text>
          <Card.Text>
            <strong>Data Usage:</strong> Your email and expenses data will be used solely for the purpose of providing the services offered by our website. We will not share your data with any third parties without your explicit consent.
          </Card.Text>
          <Card.Text>
            <strong>Data Security:</strong> We take the security of your data seriously and have implemented appropriate measures to protect it from unauthorized access or disclosure.
          </Card.Text>
          <Card.Text>
            <strong>Termination:</strong> You have the right to terminate your account and request the deletion of your data at any time.
          </Card.Text>
          <Card.Text>
            <strong>Agreement:</strong> By registering to our website, you acknowledge that you have read, understood, and agreed to these terms and conditions.
          </Card.Text>
        </Card.Body>
      </Card>
    </Col>
  </Row>
</Container>

export default TermsAndConditions;
