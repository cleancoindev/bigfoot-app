import React, {useState} from "react"
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Table,
} from "reactstrap"

import { Link } from "react-router-dom"

const Positions = props => {

  const [positions, setpositions] = useState([
    {
      id: "140",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "32.90",
    },
    {
      id: "142",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "34.95",
    },
    {
      id: "150",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "86.00",
    },
    {
      id: "150",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "32.90",
    },
    {
      id: "152",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "34.95",
    },
    {
      id: "160",
      icon: "mdi mdi-circle-multiple",
      color: "",
      title1: "Curve",
      title2: "3pool",
      collateralInDollars: "66,090.80",
      borrowCredit: "36.07",
      collateralCredit: "37.60",
      debtRatio: "86.00",
    },
  ]);

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>

          <Row>
            <Col xl="12">
              <Card>
                <CardBody>
                  <h4 className="card-title">
                    <i className="mdi mdi-order-bool-descending text-primary h1"/>
                    All Positions
                  </h4>

                  <div className="table-responsive">
                    <Table className="table table-nowrap align-middle text-center mb-0">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Pool</th>
                          <th scope="col">Collateral Value</th>
                          <th scope="col">Borrow Credit</th>
                          <th scope="col">Collateral Credit</th>
                          <th scope="col">Debt Ratio</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((position, key) => (
                          <tr key={key}>
                            <th scope="row">
                              <h5 className="font-size-14 mb-1">
                                #{position.id}
                              </h5>
                            </th>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-xs me-3">
                                  <span
                                    className={
                                      "avatar-title rounded-circle bg-soft bg-" +
                                      position.color +
                                      " text-" +
                                      position.color +
                                      " font-size-18"
                                    }
                                  >
                                    <i className={position.icon}/>
                                  </span>
                                </div>
                                <span>{position.title1}</span>
                                &nbsp;
                                <span>{position.title2}</span>
                              </div>
                            </td>
                            <td>
                              <h5 className="font-size-14 mb-1">
                                $ {position.collateralInDollars}
                              </h5>
                            </td>
                            <td>
                              <h5 className="font-size-14 mb-1">
                                {position.borrowCredit} %
                              </h5>
                            </td>
                            <td>
                              <h5 className="font-size-14 mb-1">
                                {position.collateralCredit}
                              </h5>
                            </td>
                            <td>
                              <h5 className="font-size-14 mb-1">
                                <span className={
                                  position.debtRatio < 33 ? "text-success" : 
                                  position.debtRatio < 85 ? "text-warning" : "text-danger"
                                }>
                                  {position.debtRatio} %
                                </span>
                              </h5>
                            </td>
                            <td style={{ width: "120px" }}>
                              <Link
                                to="#"
                                className="btn btn-primary btn-sm w-xs"
                                onClick={()=>{
                                  console.log("Liquidate")
                                }}
                              >
                                Liquidate
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

        </Container>
      </div>
    </React.Fragment>
  )
}
export default Positions;